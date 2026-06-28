import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../../../api/http';
import { getAnonymousUserId } from '../../../api/identity';
import { getErrorMessage } from '../../../shared/utils/errors';
import { pricePollIntervalMs } from '../../../shared/utils/game.price';
import { getBehindTheScenesFeedback } from '../dev-warnings/feedback';
import { createGuess, getGameState, getPriceState } from './game.api';
import { createPriceStateQueryOptions } from './game.queries';

type FetchCall = {
  url: string;
  init: RequestInit;
};

const createApiError = (
  code: ConstructorParameters<typeof ApiError>[1]['error']['code'],
  message: string,
) =>
  new ApiError(503, {
    error: {
      code,
      message,
    },
  });

const defaultFetchResponse = {
  score: 0,
  activeGuess: null,
  lastBet: null,
  feedback: { type: 'NONE' },
};

const installBrowserMocks = (responseBody: unknown = defaultFetchResponse) => {
  const storage = new Map<string, string>();
  const fetchCalls: FetchCall[] = [];

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    },
  });

  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      randomUUID: () => 'generated-user-id',
    },
  });

  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (url: string, init: RequestInit) => {
      fetchCalls.push({ url, init });

      return {
        ok: true,
        json: async () => responseBody,
      };
    },
  });

  return { fetchCalls, storage };
};

test('getAnonymousUserId creates and persists a generated user id', () => {
  const { storage } = installBrowserMocks();

  assert.equal(getAnonymousUserId(), 'generated-user-id');
  assert.equal(storage.get('btc-game.user-id'), 'generated-user-id');
  assert.equal(getAnonymousUserId(), 'generated-user-id');
});

test('getGameState sends x-user-id to the state endpoint', async () => {
  const { fetchCalls } = installBrowserMocks();

  await getGameState();

  assert.equal(fetchCalls[0]?.url, 'http://127.0.0.1:3000/state');
  assert.deepEqual(fetchCalls[0]?.init.headers, {
    'content-type': 'application/json',
    'x-user-id': 'generated-user-id',
  });
});

test('getPriceState sends x-user-id to the price endpoint', async () => {
  const { fetchCalls } = installBrowserMocks();

  await getPriceState();

  assert.equal(fetchCalls[0]?.url, 'http://127.0.0.1:3000/price');
  assert.deepEqual(fetchCalls[0]?.init.headers, {
    'content-type': 'application/json',
    'x-user-id': 'generated-user-id',
  });
});

test('getPriceState accepts the current price response', async () => {
  const price = {
    priceSnapshotId: 'snapshot-token',
    priceUsd: 101,
    observedAt: new Date().toISOString(),
  };

  installBrowserMocks({ price, canCreateGuess: true });

  assert.deepEqual(await getPriceState(), {
    price,
    canCreateGuess: true,
  });
});

test('getPriceState normalizes a legacy latestPrice response', async () => {
  const latestPrice = {
    priceSnapshotId: 'snapshot-token',
    priceUsd: 101,
    observedAt: new Date().toISOString(),
  };

  installBrowserMocks({ latestPrice });

  assert.deepEqual(await getPriceState(), {
    price: latestPrice,
    canCreateGuess: true,
  });
});

test('createGuess submits direction and priceSnapshotId without a raw price', async () => {
  const { fetchCalls } = installBrowserMocks();

  await createGuess('UP', 'snapshot-token');

  assert.equal(fetchCalls[0]?.url, 'http://127.0.0.1:3000/guesses');
  assert.equal(fetchCalls[0]?.init.method, 'POST');
  assert.deepEqual(JSON.parse(fetchCalls[0]?.init.body as string), {
    direction: 'UP',
    priceSnapshotId: 'snapshot-token',
  });
});

test('price query options respect the explicit enabled flag', () => {
  assert.equal(createPriceStateQueryOptions(false).enabled, false);
  assert.equal(createPriceStateQueryOptions(true).enabled, true);
});

test('price query uses client-owned polling frequency', () => {
  const options = createPriceStateQueryOptions(true);

  assert.equal(options.staleTime, Number.POSITIVE_INFINITY);
  assert.equal(options.refetchInterval, pricePollIntervalMs);
  assert.equal(options.refetchOnWindowFocus, false);
});

test('price provider outage uses generic user-facing copy', () => {
  const error = createApiError(
    'PRICE_PROVIDER_UNAVAILABLE',
    'The price provider is unavailable.',
  );

  assert.equal(
    getErrorMessage(error),
    'Something went wrong. Please try again.',
  );
});

test('network fetch failures use generic user-facing copy', () => {
  const error = new TypeError('Failed to fetch');

  assert.equal(
    getErrorMessage(error),
    'Something went wrong. Please try again.',
  );
});

test('price provider outage appears in behind-the-scenes feedback', () => {
  const error = createApiError(
    'PRICE_PROVIDER_UNAVAILABLE',
    'The price provider is unavailable.',
  );

  assert.deepEqual(
    getBehindTheScenesFeedback({
      error,
      hasGameState: false,
      hasLatestPrice: false,
      isPriceUnavailable: false,
      isCheckingResults: false,
      isGameStateFetching: false,
      isPriceFetching: false,
    }),
    ['Price provider unavailable; showing a generic error to the user.'],
  );
});

test('network fetch failures appear in behind-the-scenes feedback', () => {
  const error = new TypeError('Failed to fetch');

  assert.deepEqual(
    getBehindTheScenesFeedback({
      error,
      hasGameState: false,
      hasLatestPrice: false,
      isPriceUnavailable: false,
      isCheckingResults: false,
      isGameStateFetching: false,
      isPriceFetching: false,
    }),
    [
      'Unexpected client error; showing a generic error to the user. Failed to fetch',
    ],
  );
});
