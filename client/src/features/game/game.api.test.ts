import assert from 'node:assert/strict';
import test from 'node:test';

import { getAnonymousUserId } from '../../api/identity.js';
import { createGuess, getGameState, getPriceState } from './game.api.js';
import {
  createGameStateQueryOptions,
  createPriceStateQueryOptions,
} from './game.queries.js';
import type {
  GameStateResponse,
  PriceStateResponse,
} from '@epilot/api-contract';

type FetchCall = {
  url: string;
  init: RequestInit;
};

const installBrowserMocks = () => {
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
        json: async () => ({
          score: 0,
          activeGuess: null,
          feedback: { type: 'NONE' },
        }),
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

test('price query can be disabled while a guess is active', () => {
  assert.equal(createPriceStateQueryOptions(false).enabled, false);
  assert.equal(createPriceStateQueryOptions(true).enabled, true);
});

test('resolved comparison price remains available while its snapshot is fresh', () => {
  const latestPrice = {
    priceSnapshotId: 'resolved-snapshot',
    priceUsd: 101,
    observedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30_000).toISOString(),
  };
  const previousState: GameStateResponse = {
    score: 1,
    activeGuess: null,
    feedback: {
      type: 'RESOLVED',
      outcome: 'CORRECT',
      scoreDelta: 1,
    },
    latestPrice,
  };
  const nextState: GameStateResponse = {
    score: 1,
    activeGuess: null,
    feedback: { type: 'NONE' },
  };
  const structuralSharing =
    createGameStateQueryOptions('generated-user-id').structuralSharing;

  if (typeof structuralSharing !== 'function') {
    assert.fail('Expected game state query structuralSharing to be a function');
  }

  const mergedState = structuralSharing(previousState, nextState);

  assert.deepEqual(mergedState, {
    ...nextState,
    latestPrice,
  });
});

test('price query stays fresh until the signed snapshot expires', () => {
  const latestPrice = {
    priceSnapshotId: 'resolved-snapshot',
    priceUsd: 101,
    observedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30_000).toISOString(),
  };
  const staleTime = createPriceStateQueryOptions(true).staleTime;

  if (typeof staleTime !== 'function') {
    assert.fail('Expected price query staleTime to be a function');
  }

  const freshMs = (
    staleTime as (query: { state: { data: PriceStateResponse } }) => number
  )({
    state: {
      data: {
        latestPrice,
      } satisfies PriceStateResponse,
    },
  });

  assert.ok(typeof freshMs === 'number' && freshMs > 25_000);
});
