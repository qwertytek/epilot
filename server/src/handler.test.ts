import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ApiErrorResponse,
  CreateGuessResponse,
  GameStateResponse,
  ResolveGuessResponse,
} from '@epilot/api-contract';

import { createHandler } from './handler.js';

type TestEvent = Parameters<ReturnType<typeof createHandler>>[0];

const baseTimeMs = Date.parse('2026-06-25T12:00:00.000Z');
const userHeaders = { 'x-user-id': 'user-1' };
const browserHeaders = {
  origin: 'http://localhost:5173',
  'x-user-id': 'user-1',
};

const event = (
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = userHeaders,
): TestEvent => ({
  rawPath: path,
  headers,
  requestContext: { http: { method, path } },
  body: body === undefined ? undefined : JSON.stringify(body),
});

const json = <T>(response: { body: string }): T =>
  JSON.parse(response.body) as T;

const createTestHandler = (
  prices: number[] = [100],
  options: {
    currentTimeMs?: number;
    providerCacheTtlMs?: number;
  } = {},
) => {
  let currentTimeMs = options.currentTimeMs ?? baseTimeMs;
  let calls = 0;

  const handler = createHandler({
    now: () => new Date(currentTimeMs),
    snapshotSigningSecret: 'test-secret',
    providerCacheTtlMs: options.providerCacheTtlMs ?? 0,
    priceProvider: async () => {
      const price = prices[Math.min(calls, prices.length - 1)];
      calls += 1;

      if (price === undefined) {
        throw new Error('missing test price');
      }

      return price;
    },
  });

  return {
    handler,
    get calls() {
      return calls;
    },
    advance(ms: number) {
      currentTimeMs += ms;
    },
  };
};

test('GET /health returns ok without x-user-id', async () => {
  const { handler } = createTestHandler();
  const response = await handler(event('GET', '/health', undefined, {}));

  assert.equal(response.statusCode, 200);
  assert.deepEqual(json(response), { status: 'ok' });
});

test('GET /state without x-user-id returns 401 MISSING_USER_ID', async () => {
  const { handler } = createTestHandler();
  const response = await handler(
    event('GET', '/state', undefined, {
      origin: 'http://localhost:5173',
    }),
  );
  const body = json<ApiErrorResponse>(response);

  assert.equal(response.statusCode, 401);
  assert.equal(body.code, 'MISSING_USER_ID');
  assert.equal(
    response.headers['access-control-allow-origin'],
    'http://localhost:5173',
  );
});

test('OPTIONS preflight returns CORS headers without x-user-id', async () => {
  const { handler } = createTestHandler();
  const response = await handler(
    event('OPTIONS', '/guesses', undefined, {
      origin: 'http://localhost:5173',
    }),
  );

  assert.equal(response.statusCode, 204);
  assert.equal(response.body, '');
  assert.equal(
    response.headers['access-control-allow-origin'],
    'http://localhost:5173',
  );
  assert.equal(
    response.headers['access-control-allow-headers'],
    'content-type,x-user-id',
  );
  assert.equal(
    response.headers['access-control-allow-methods'],
    'GET,POST,OPTIONS',
  );
});

test('first GET /state returns score 0, no active guess, and a price snapshot', async () => {
  const { handler } = createTestHandler([101]);
  const response = await handler(
    event('GET', '/state', undefined, browserHeaders),
  );
  const body = json<GameStateResponse>(response);

  assert.equal(response.statusCode, 200);
  assert.equal(
    response.headers['access-control-allow-origin'],
    'http://localhost:5173',
  );
  assert.equal(body.userId, 'user-1');
  assert.equal(body.score, 0);
  assert.equal(body.activeGuess, undefined);
  assert.equal(body.priceSnapshot.priceUsd, 101);
  assert.equal(typeof body.priceSnapshot.priceSnapshotId, 'string');
});

test('repeated state calls within cache TTL avoid repeated provider calls', async () => {
  const context = createTestHandler([100, 200], { providerCacheTtlMs: 10_000 });

  const first = await context.handler(event('GET', '/state'));
  const second = await context.handler(event('GET', '/state'));

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
  assert.equal(context.calls, 1);
  assert.equal(json<GameStateResponse>(second).priceSnapshot.priceUsd, 100);
});

test('valid unexpired snapshot token can create a guess', async () => {
  const { handler } = createTestHandler([100]);
  const state = json<GameStateResponse>(await handler(event('GET', '/state')));
  const response = await handler(
    event('POST', '/guesses', {
      direction: 'up',
      priceSnapshotId: state.priceSnapshot.priceSnapshotId,
    }),
  );
  const body = json<CreateGuessResponse>(response);

  assert.equal(response.statusCode, 200);
  assert.equal(body.score, 0);
  assert.equal(body.activeGuess.direction, 'up');
  assert.equal(body.activeGuess.startPriceUsd, 100);
});

test('expired snapshot token is rejected', async () => {
  const context = createTestHandler([100]);
  const state = json<GameStateResponse>(
    await context.handler(event('GET', '/state')),
  );
  context.advance(30_001);

  const response = await context.handler(
    event('POST', '/guesses', {
      direction: 'up',
      priceSnapshotId: state.priceSnapshot.priceSnapshotId,
    }),
  );
  const body = json<ApiErrorResponse>(response);

  assert.equal(response.statusCode, 410);
  assert.equal(body.code, 'PRICE_SNAPSHOT_EXPIRED');
});

test('tampered snapshot token is rejected', async () => {
  const { handler } = createTestHandler([100]);
  const state = json<GameStateResponse>(await handler(event('GET', '/state')));
  const response = await handler(
    event('POST', '/guesses', {
      direction: 'up',
      priceSnapshotId: `${state.priceSnapshot.priceSnapshotId}x`,
    }),
  );
  const body = json<ApiErrorResponse>(response);

  assert.equal(response.statusCode, 422);
  assert.equal(body.code, 'PRICE_SNAPSHOT_INVALID');
});

test('user cannot submit a raw price', async () => {
  const { handler } = createTestHandler([100]);
  const response = await handler(
    event('POST', '/guesses', {
      direction: 'up',
      startPriceUsd: 100,
    }),
  );
  const body = json<ApiErrorResponse>(response);

  assert.equal(response.statusCode, 422);
  assert.equal(body.code, 'INVALID_REQUEST');
});

test('user cannot create a second active guess', async () => {
  const { handler } = createTestHandler([100]);
  const state = json<GameStateResponse>(await handler(event('GET', '/state')));
  const payload = {
    direction: 'up',
    priceSnapshotId: state.priceSnapshot.priceSnapshotId,
  };

  assert.equal(
    (await handler(event('POST', '/guesses', payload))).statusCode,
    200,
  );

  const response = await handler(event('POST', '/guesses', payload));
  const body = json<ApiErrorResponse>(response);

  assert.equal(response.statusCode, 409);
  assert.equal(body.code, 'ACTIVE_GUESS_EXISTS');
});

test('concurrent create requests result in exactly one active guess', async () => {
  const { handler } = createTestHandler([100]);
  const state = json<GameStateResponse>(await handler(event('GET', '/state')));
  const payload = {
    direction: 'up',
    priceSnapshotId: state.priceSnapshot.priceSnapshotId,
  };

  const responses = await Promise.all([
    handler(event('POST', '/guesses', payload)),
    handler(event('POST', '/guesses', payload)),
  ]);

  assert.deepEqual(
    responses.map((response) => response.statusCode).sort(),
    [200, 409],
  );
});

test('guess cannot resolve before 60 seconds', async () => {
  const { handler } = createTestHandler([100, 110]);
  const state = json<GameStateResponse>(await handler(event('GET', '/state')));
  await handler(
    event('POST', '/guesses', {
      direction: 'up',
      priceSnapshotId: state.priceSnapshot.priceSnapshotId,
    }),
  );

  const response = await handler(event('POST', '/guesses/resolve'));
  const body = json<ResolveGuessResponse>(response);

  assert.equal(response.statusCode, 200);
  assert.equal(body.status, 'NOT_READY');
  assert.equal(body.activeGuess?.direction, 'up');
});

test('guess remains pending when observed price is unchanged', async () => {
  const context = createTestHandler([100, 100]);
  const state = json<GameStateResponse>(
    await context.handler(event('GET', '/state')),
  );
  await context.handler(
    event('POST', '/guesses', {
      direction: 'up',
      priceSnapshotId: state.priceSnapshot.priceSnapshotId,
    }),
  );
  context.advance(60_000);

  const response = await context.handler(event('POST', '/guesses/resolve'));
  const body = json<ResolveGuessResponse>(response);

  assert.equal(response.statusCode, 200);
  assert.equal(body.status, 'PRICE_UNCHANGED');
  assert.equal(body.activeGuess?.startPriceUsd, 100);
});

test('correct guess increments score', async () => {
  const context = createTestHandler([100, 101]);
  const state = json<GameStateResponse>(
    await context.handler(event('GET', '/state')),
  );
  await context.handler(
    event('POST', '/guesses', {
      direction: 'up',
      priceSnapshotId: state.priceSnapshot.priceSnapshotId,
    }),
  );
  context.advance(60_000);

  const response = await context.handler(event('POST', '/guesses/resolve'));
  const body = json<ResolveGuessResponse>(response);

  assert.equal(body.status, 'RESOLVED');
  assert.equal(body.score, 1);
  assert.equal(body.activeGuess, undefined);
});

test('incorrect guess decrements score', async () => {
  const context = createTestHandler([100, 99]);
  const state = json<GameStateResponse>(
    await context.handler(event('GET', '/state')),
  );
  await context.handler(
    event('POST', '/guesses', {
      direction: 'up',
      priceSnapshotId: state.priceSnapshot.priceSnapshotId,
    }),
  );
  context.advance(60_000);

  const response = await context.handler(event('POST', '/guesses/resolve'));
  const body = json<ResolveGuessResponse>(response);

  assert.equal(body.status, 'RESOLVED');
  assert.equal(body.score, -1);
});

test('repeated resolve cannot score the same guess twice', async () => {
  const context = createTestHandler([100, 101, 102]);
  const state = json<GameStateResponse>(
    await context.handler(event('GET', '/state')),
  );
  await context.handler(
    event('POST', '/guesses', {
      direction: 'up',
      priceSnapshotId: state.priceSnapshot.priceSnapshotId,
    }),
  );
  context.advance(60_000);

  const first = json<ResolveGuessResponse>(
    await context.handler(event('POST', '/guesses/resolve')),
  );
  const secondResponse = await context.handler(
    event('POST', '/guesses/resolve'),
  );
  const second = json<ApiErrorResponse>(secondResponse);

  assert.equal(first.score, 1);
  assert.equal(secondResponse.statusCode, 409);
  assert.equal(second.code, 'NO_ACTIVE_GUESS');
});

test('CoinGecko failure preserves player state and returns 503 PRICE_PROVIDER_UNAVAILABLE', async () => {
  const context = createTestHandler([100]);
  const state = json<GameStateResponse>(
    await context.handler(event('GET', '/state')),
  );
  await context.handler(
    event('POST', '/guesses', {
      direction: 'down',
      priceSnapshotId: state.priceSnapshot.priceSnapshotId,
    }),
  );

  const failingHandler = createHandler({
    now: () => new Date(baseTimeMs + 60_000),
    snapshotSigningSecret: 'test-secret',
    providerCacheTtlMs: 0,
    players: new Map([
      [
        'user-1',
        {
          userId: 'user-1',
          score: 7,
          activeGuess: {
            direction: 'down',
            startPriceUsd: 100,
            createdAt: new Date(baseTimeMs).toISOString(),
            eligibleAt: new Date(baseTimeMs + 60_000).toISOString(),
          },
          createdAt: new Date(baseTimeMs).toISOString(),
          updatedAt: new Date(baseTimeMs).toISOString(),
        },
      ],
    ]),
    priceProvider: async () => {
      throw new Error('provider unavailable');
    },
  });

  const response = await failingHandler(event('POST', '/guesses/resolve'));
  const body = json<ApiErrorResponse>(response);

  assert.equal(response.statusCode, 503);
  assert.equal(body.code, 'PRICE_PROVIDER_UNAVAILABLE');
});
