import assert from 'node:assert/strict';
import test from 'node:test';

import { createGuess, getAnonymousUserId, getGameState } from './game.api.js';

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
          userId: 'generated-user-id',
          score: 0,
          latestPrice: {
            priceSnapshotId: 'snapshot-token',
            priceUsd: 100,
            observedAt: '2026-06-25T12:00:00.000Z',
            expiresAt: '2026-06-25T12:00:30.000Z',
          },
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
