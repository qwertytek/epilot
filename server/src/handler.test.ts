import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import type {
  ApiErrorResponse,
  CreateGuessResponse,
  GameStateResponse,
  PriceStateResponse,
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

const template = readFileSync(new URL('../template.yaml', import.meta.url), {
  encoding: 'utf8',
});

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

const getPriceState = async (
  handler: ReturnType<typeof createTestHandler>['handler'],
): Promise<PriceStateResponse> =>
  json<PriceStateResponse>(await handler(event('GET', '/price')));

test('GET /health returns ok without x-user-id', async () => {
  const { handler } = createTestHandler();
  const response = await handler(event('GET', '/health', undefined, {}));

  assert.equal(response.statusCode, 200);
  assert.deepEqual(json(response), { status: 'ok' });
});

test('SAM template exposes the price endpoint', () => {
  assert.match(
    template,
    /Path:\s*\/price\s+Method:\s*get/,
    'GET /price must be registered in server/template.yaml for local CORS preflight and API Gateway routing',
  );
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
  assert.equal(body.error.code, 'MISSING_USER_ID');
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

test('unknown API route returns 404 INVALID_REQUEST', async () => {
  const { handler } = createTestHandler();
  const response = await handler(event('GET', '/missing'));
  const body = json<ApiErrorResponse>(response);

  assert.equal(response.statusCode, 404);
  assert.equal(body.error.code, 'INVALID_REQUEST');
});

test('first GET /state returns score 0 and no active guess without fetching price', async () => {
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
  assert.equal(body.score, 0);
  assert.equal(body.activeGuess, null);
  assert.equal(body.feedback.type, 'NONE');
});

test('GET /price returns a price snapshot', async () => {
  const { handler } = createTestHandler([101]);
  const response = await handler(
    event('GET', '/price', undefined, browserHeaders),
  );
  const body = json<PriceStateResponse>(response);

  assert.equal(response.statusCode, 200);
  assert.equal(
    response.headers['access-control-allow-origin'],
    'http://localhost:5173',
  );
  assert.equal(body.latestPrice.priceUsd, 101);
  assert.equal(typeof body.latestPrice.priceSnapshotId, 'string');
  assert.equal(body.latestPrice.observedAt, '2026-06-25T12:00:00.000Z');
});

test('repeated price calls within cache TTL avoid repeated provider calls', async () => {
  const context = createTestHandler([100, 200], { providerCacheTtlMs: 10_000 });

  const first = await context.handler(event('GET', '/price'));
  const second = await context.handler(event('GET', '/price'));

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
  assert.equal(context.calls, 1);
  assert.equal(json<PriceStateResponse>(second).latestPrice.priceUsd, 100);
});

test('price state can return stale cached price while refreshing the provider', async () => {
  const context = createTestHandler([100, 200], { providerCacheTtlMs: 10_000 });

  const first = json<PriceStateResponse>(
    await context.handler(event('GET', '/price')),
  );
  context.advance(10_001);
  const second = json<PriceStateResponse>(
    await context.handler(event('GET', '/price')),
  );
  await Promise.resolve();
  const third = json<PriceStateResponse>(
    await context.handler(event('GET', '/price')),
  );

  assert.equal(first.latestPrice.priceUsd, 100);
  assert.equal(second.latestPrice.priceUsd, 100);
  assert.equal(second.latestPrice.observedAt, '2026-06-25T12:00:00.000Z');
  assert.equal(third.latestPrice.priceUsd, 200);
  assert.equal(context.calls, 2);
});

test('valid unexpired snapshot token can create a guess', async () => {
  const { handler } = createTestHandler([100]);
  const priceState = await getPriceState(handler);
  const response = await handler(
    event('POST', '/guesses', {
      direction: 'UP',
      priceSnapshotId: priceState.latestPrice.priceSnapshotId,
    }),
  );
  const body = json<CreateGuessResponse>(response);

  assert.equal(response.statusCode, 201);
  assert.equal(body.score, 0);
  assert.equal(body.activeGuess?.direction, 'UP');
  assert.equal(body.activeGuess?.startPriceUsd, 100);
  assert.equal(body.feedback.type, 'GUESS_CREATED');
});

test('expired snapshot token is rejected', async () => {
  const context = createTestHandler([100]);
  const priceState = await getPriceState(context.handler);
  context.advance(30_001);

  const response = await context.handler(
    event('POST', '/guesses', {
      direction: 'UP',
      priceSnapshotId: priceState.latestPrice.priceSnapshotId,
    }),
  );
  const body = json<ApiErrorResponse>(response);

  assert.equal(response.statusCode, 410);
  assert.equal(body.error.code, 'PRICE_SNAPSHOT_EXPIRED');
});

test('expired snapshot rejection includes a freshly fetched latest price', async () => {
  const context = createTestHandler([100, 200], { providerCacheTtlMs: 10_000 });
  const priceState = await getPriceState(context.handler);
  context.advance(30_001);

  const response = await context.handler(
    event('POST', '/guesses', {
      direction: 'UP',
      priceSnapshotId: priceState.latestPrice.priceSnapshotId,
    }),
  );
  const body = json<ApiErrorResponse>(response);
  const details = body.error.details as
    | { latestPrice?: { priceUsd?: unknown } }
    | undefined;

  assert.equal(response.statusCode, 410);
  assert.equal(body.error.code, 'PRICE_SNAPSHOT_EXPIRED');
  assert.equal(details?.latestPrice?.priceUsd, 200);
});

test('tampered snapshot token is rejected', async () => {
  const { handler } = createTestHandler([100]);
  const priceState = await getPriceState(handler);
  const response = await handler(
    event('POST', '/guesses', {
      direction: 'UP',
      priceSnapshotId: `${priceState.latestPrice.priceSnapshotId}x`,
    }),
  );
  const body = json<ApiErrorResponse>(response);

  assert.equal(response.statusCode, 422);
  assert.equal(body.error.code, 'PRICE_SNAPSHOT_INVALID');
});

test('malformed guess request body returns 422 INVALID_REQUEST', async () => {
  const { handler } = createTestHandler([100]);
  const response = await handler({
    ...event('POST', '/guesses'),
    body: '{not json',
  });
  const body = json<ApiErrorResponse>(response);

  assert.equal(response.statusCode, 422);
  assert.equal(body.error.code, 'INVALID_REQUEST');
});

test('user cannot submit a raw price', async () => {
  const { handler } = createTestHandler([100]);
  const response = await handler(
    event('POST', '/guesses', {
      direction: 'UP',
      startPriceUsd: 100,
    }),
  );
  const body = json<ApiErrorResponse>(response);

  assert.equal(response.statusCode, 422);
  assert.equal(body.error.code, 'INVALID_REQUEST');
});

test('user cannot submit extra fields with a valid guess request', async () => {
  const { handler } = createTestHandler([100]);
  const priceState = await getPriceState(handler);
  const response = await handler(
    event('POST', '/guesses', {
      direction: 'UP',
      priceSnapshotId: priceState.latestPrice.priceSnapshotId,
      startPriceUsd: 100,
    }),
  );
  const body = json<ApiErrorResponse>(response);

  assert.equal(response.statusCode, 422);
  assert.equal(body.error.code, 'INVALID_REQUEST');
});

test('user cannot create a second active guess', async () => {
  const { handler } = createTestHandler([100]);
  const priceState = await getPriceState(handler);
  const payload = {
    direction: 'UP',
    priceSnapshotId: priceState.latestPrice.priceSnapshotId,
  };

  assert.equal(
    (await handler(event('POST', '/guesses', payload))).statusCode,
    201,
  );

  const response = await handler(event('POST', '/guesses', payload));
  const body = json<ApiErrorResponse>(response);

  assert.equal(response.statusCode, 409);
  assert.equal(body.error.code, 'ACTIVE_GUESS_EXISTS');
});

test('concurrent create requests result in exactly one active guess', async () => {
  const { handler } = createTestHandler([100]);
  const priceState = await getPriceState(handler);
  const payload = {
    direction: 'UP',
    priceSnapshotId: priceState.latestPrice.priceSnapshotId,
  };

  const responses = await Promise.all([
    handler(event('POST', '/guesses', payload)),
    handler(event('POST', '/guesses', payload)),
  ]);

  assert.deepEqual(
    responses.map((response) => response.statusCode).sort(),
    [201, 409],
  );
});

test('guess cannot resolve before 60 seconds without fetching a new price', async () => {
  const context = createTestHandler([100, 110]);
  const priceState = await getPriceState(context.handler);
  await context.handler(
    event('POST', '/guesses', {
      direction: 'UP',
      priceSnapshotId: priceState.latestPrice.priceSnapshotId,
    }),
  );
  assert.equal(context.calls, 1);

  const response = await context.handler(event('POST', '/guesses/resolve'));
  const body = json<ResolveGuessResponse>(response);

  assert.equal(response.statusCode, 200);
  assert.equal(body.feedback.type, 'NOT_READY');
  assert.equal(body.activeGuess?.direction, 'UP');
  assert.equal(body.latestPrice, undefined);
  assert.equal(context.calls, 1);
});

test('GET /state keeps guess pending before 60 seconds', async () => {
  const context = createTestHandler([100, 110]);
  const priceState = await getPriceState(context.handler);
  await context.handler(
    event('POST', '/guesses', {
      direction: 'UP',
      priceSnapshotId: priceState.latestPrice.priceSnapshotId,
    }),
  );
  context.advance(59_999);

  const response = await context.handler(event('GET', '/state'));
  const body = json<GameStateResponse>(response);

  assert.equal(response.statusCode, 200);
  assert.equal(body.score, 0);
  assert.equal(body.activeGuess?.direction, 'UP');
  assert.equal(body.feedback.type, 'NONE');
  assert.equal(body.latestPrice, undefined);
  assert.equal(context.calls, 1);
});

test('GET /state resolves an eligible winning guess and updates score', async () => {
  const context = createTestHandler([100, 101]);
  const priceState = await getPriceState(context.handler);
  await context.handler(
    event('POST', '/guesses', {
      direction: 'UP',
      priceSnapshotId: priceState.latestPrice.priceSnapshotId,
    }),
  );
  context.advance(60_000);

  const response = await context.handler(event('GET', '/state'));
  const body = json<GameStateResponse>(response);

  assert.equal(response.statusCode, 200);
  assert.equal(body.score, 1);
  assert.equal(body.activeGuess, null);
  assert.equal(body.latestPrice?.priceUsd, 101);
  assert.equal(body.feedback.type, 'RESOLVED');
  assert.equal(body.feedback.outcome, 'CORRECT');
  assert.equal(context.calls, 2);
});

test('GET /state resolves an eligible losing guess and updates score', async () => {
  const context = createTestHandler([100, 99]);
  const priceState = await getPriceState(context.handler);
  await context.handler(
    event('POST', '/guesses', {
      direction: 'UP',
      priceSnapshotId: priceState.latestPrice.priceSnapshotId,
    }),
  );
  context.advance(60_000);

  const response = await context.handler(event('GET', '/state'));
  const body = json<GameStateResponse>(response);

  assert.equal(response.statusCode, 200);
  assert.equal(body.score, -1);
  assert.equal(body.activeGuess, null);
  assert.equal(body.latestPrice?.priceUsd, 99);
  assert.equal(body.feedback.type, 'RESOLVED');
  assert.equal(body.feedback.outcome, 'INCORRECT');
});

test('resolve without an active guess returns 409 NO_ACTIVE_GUESS', async () => {
  const { handler } = createTestHandler([100]);
  const response = await handler(event('POST', '/guesses/resolve'));
  const body = json<ApiErrorResponse>(response);

  assert.equal(response.statusCode, 409);
  assert.equal(body.error.code, 'NO_ACTIVE_GUESS');
});

test('guess remains pending when observed price is unchanged', async () => {
  const context = createTestHandler([100, 100]);
  const priceState = await getPriceState(context.handler);
  await context.handler(
    event('POST', '/guesses', {
      direction: 'UP',
      priceSnapshotId: priceState.latestPrice.priceSnapshotId,
    }),
  );
  context.advance(60_000);

  const response = await context.handler(event('POST', '/guesses/resolve'));
  const body = json<ResolveGuessResponse>(response);

  assert.equal(response.statusCode, 200);
  assert.equal(body.feedback.type, 'PRICE_UNCHANGED');
  assert.equal(body.activeGuess?.startPriceUsd, 100);
});

test('correct guess increments score', async () => {
  const context = createTestHandler([100, 101]);
  const priceState = await getPriceState(context.handler);
  await context.handler(
    event('POST', '/guesses', {
      direction: 'UP',
      priceSnapshotId: priceState.latestPrice.priceSnapshotId,
    }),
  );
  context.advance(60_000);

  const response = await context.handler(event('POST', '/guesses/resolve'));
  const body = json<ResolveGuessResponse>(response);

  assert.equal(body.feedback.type, 'RESOLVED');
  assert.equal(body.score, 1);
  assert.equal(body.activeGuess, null);
  assert.equal(body.feedback.type, 'RESOLVED');
  assert.equal(body.feedback.scoreDelta, 1);
});

test('correct down guess increments score', async () => {
  const context = createTestHandler([100, 99]);
  const priceState = await getPriceState(context.handler);
  await context.handler(
    event('POST', '/guesses', {
      direction: 'DOWN',
      priceSnapshotId: priceState.latestPrice.priceSnapshotId,
    }),
  );
  context.advance(60_000);

  const response = await context.handler(event('POST', '/guesses/resolve'));
  const body = json<ResolveGuessResponse>(response);

  assert.equal(body.feedback.type, 'RESOLVED');
  assert.equal(body.score, 1);
});

test('incorrect guess decrements score', async () => {
  const context = createTestHandler([100, 99]);
  const priceState = await getPriceState(context.handler);
  await context.handler(
    event('POST', '/guesses', {
      direction: 'UP',
      priceSnapshotId: priceState.latestPrice.priceSnapshotId,
    }),
  );
  context.advance(60_000);

  const response = await context.handler(event('POST', '/guesses/resolve'));
  const body = json<ResolveGuessResponse>(response);

  assert.equal(body.feedback.type, 'RESOLVED');
  assert.equal(body.score, -1);
});

test('repeated resolve cannot score the same guess twice', async () => {
  const context = createTestHandler([100, 101, 102]);
  const priceState = await getPriceState(context.handler);
  await context.handler(
    event('POST', '/guesses', {
      direction: 'UP',
      priceSnapshotId: priceState.latestPrice.priceSnapshotId,
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
  assert.equal(second.error.code, 'NO_ACTIVE_GUESS');
});

test('CoinGecko failure preserves player state and returns 503 PRICE_PROVIDER_UNAVAILABLE', async () => {
  const context = createTestHandler([100]);
  const priceState = await getPriceState(context.handler);
  await context.handler(
    event('POST', '/guesses', {
      direction: 'DOWN',
      priceSnapshotId: priceState.latestPrice.priceSnapshotId,
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
            id: 'guess-1',
            direction: 'DOWN',
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
  assert.equal(body.error.code, 'PRICE_PROVIDER_UNAVAILABLE');
});
