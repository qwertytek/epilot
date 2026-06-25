import { createHmac, timingSafeEqual } from 'node:crypto';

import type {
  ActiveGuess,
  ApiErrorCode,
  ApiErrorResponse,
  CreateGuessRequest,
  CreateGuessResponse,
  GameStateResponse,
  GuessDirection,
  HealthResponse,
  PriceSnapshot,
  ResolveGuessResponse,
} from '@epilot/api-contract';

type ApiGatewayEvent = {
  rawPath?: string;
  headers?: Record<string, string | undefined>;
  body?: string | null;
  requestContext?: {
    http?: {
      method?: string;
      path?: string;
    };
  };
};

type Response = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

type Player = {
  userId: string;
  score: number;
  activeGuess?: ActiveGuess;
  createdAt: string;
  updatedAt: string;
};

type SnapshotPayload = {
  priceUsd: number;
  issuedAt: string;
  expiresAt: string;
};

type PriceProvider = () => Promise<number>;

type HandlerOptions = {
  now?: () => Date;
  priceProvider?: PriceProvider;
  coinGeckoPriceUrl?: string;
  snapshotSigningSecret?: string;
  snapshotValidityMs?: number;
  providerCacheTtlMs?: number;
  guessEligibilityMs?: number;
  players?: Map<string, Player>;
};

const jsonHeaders = {
  'content-type': 'application/json',
};

const defaultSnapshotValidityMs = 30_000;
const defaultProviderCacheTtlMs = 10_000;
const defaultGuessEligibilityMs = 60_000;
const defaultCoinGeckoPriceUrl =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';

const errorMessages: Record<ApiErrorCode, string> = {
  MISSING_USER_ID: 'Missing x-user-id header.',
  ACTIVE_GUESS_EXISTS: 'An active guess already exists for this user.',
  NO_ACTIVE_GUESS: 'No active guess exists for this user.',
  PRICE_SNAPSHOT_EXPIRED: 'The price snapshot has expired.',
  INVALID_REQUEST: 'The request payload is invalid.',
  PRICE_SNAPSHOT_INVALID: 'The price snapshot is invalid.',
  PRICE_PROVIDER_UNAVAILABLE: 'The price provider is unavailable.',
};

class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ApiErrorCode,
    readonly details?: unknown,
  ) {
    super(errorMessages[code]);
  }
}

const respond = <T>(statusCode: number, body: T): Response => ({
  statusCode,
  headers: jsonHeaders,
  body: JSON.stringify(body),
});

const respondError = (
  statusCode: number,
  code: ApiErrorCode,
  details?: unknown,
): Response => {
  const body: ApiErrorResponse = {
    code,
    message: errorMessages[code],
    ...(details === undefined ? {} : { details }),
  };

  return respond(statusCode, body);
};

const encodeBase64Url = (value: string): string =>
  Buffer.from(value).toString('base64url');

const decodeBase64Url = (value: string): string =>
  Buffer.from(value, 'base64url').toString('utf8');

const sign = (payload: string, secret: string): string =>
  createHmac('sha256', secret).update(payload).digest('base64url');

const isValidSignature = (
  payload: string,
  signature: string,
  secret: string,
): boolean => {
  const expected = sign(payload, secret);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
};

const createSnapshotToken = (
  payload: SnapshotPayload,
  secret: string,
): string => {
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
};

const parseSnapshotToken = (
  priceSnapshotId: string,
  secret: string,
  now: Date,
): SnapshotPayload => {
  const [encodedPayload, signature, extra] = priceSnapshotId.split('.');

  if (!encodedPayload || !signature || extra !== undefined) {
    throw new ApiError(422, 'PRICE_SNAPSHOT_INVALID');
  }

  if (!isValidSignature(encodedPayload, signature, secret)) {
    throw new ApiError(422, 'PRICE_SNAPSHOT_INVALID');
  }

  try {
    const payload = JSON.parse(
      decodeBase64Url(encodedPayload),
    ) as SnapshotPayload;

    if (
      typeof payload.priceUsd !== 'number' ||
      !Number.isFinite(payload.priceUsd) ||
      Number.isNaN(Date.parse(payload.issuedAt)) ||
      Number.isNaN(Date.parse(payload.expiresAt))
    ) {
      throw new ApiError(422, 'PRICE_SNAPSHOT_INVALID');
    }

    if (Date.parse(payload.expiresAt) <= now.getTime()) {
      throw new ApiError(410, 'PRICE_SNAPSHOT_EXPIRED');
    }

    return payload;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(422, 'PRICE_SNAPSHOT_INVALID');
  }
};

const getNumberEnv = (name: string, fallback: number): number => {
  const value = process.env[name];

  if (value === undefined) {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const createCoinGeckoPriceProvider =
  (url: string): PriceProvider =>
  async () => {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`CoinGecko returned ${response.status}`);
    }

    const payload = (await response.json()) as {
      bitcoin?: { usd?: unknown };
    };
    const priceUsd = payload.bitcoin?.usd;

    if (typeof priceUsd !== 'number' || !Number.isFinite(priceUsd)) {
      throw new Error('CoinGecko response did not include bitcoin.usd');
    }

    return priceUsd;
  };

const getHeader = (
  headers: Record<string, string | undefined> | undefined,
  name: string,
): string | undefined => {
  const normalizedName = name.toLowerCase();
  const match = Object.entries(headers ?? {}).find(
    ([key]) => key.toLowerCase() === normalizedName,
  );

  return match?.[1];
};

const parseBody = <T>(event: ApiGatewayEvent): T => {
  if (!event.body) {
    throw new ApiError(422, 'INVALID_REQUEST');
  }

  try {
    return JSON.parse(event.body) as T;
  } catch {
    throw new ApiError(422, 'INVALID_REQUEST');
  }
};

const isGuessDirection = (value: unknown): value is GuessDirection =>
  value === 'up' || value === 'down';

type PublicPlayerState = {
  userId: string;
  score: number;
  activeGuess?: ActiveGuess;
};

const toPublicPlayer = (player: Player): PublicPlayerState => {
  const state: PublicPlayerState = {
    userId: player.userId,
    score: player.score,
  };

  if (player.activeGuess !== undefined) {
    state.activeGuess = player.activeGuess;
  }

  return state;
};

const createHandler = (options: HandlerOptions = {}) => {
  const now = options.now ?? (() => new Date());
  const coinGeckoPriceUrl =
    options.coinGeckoPriceUrl ??
    process.env.COINGECKO_PRICE_URL ??
    defaultCoinGeckoPriceUrl;
  const priceProvider =
    options.priceProvider ?? createCoinGeckoPriceProvider(coinGeckoPriceUrl);
  const snapshotSigningSecret =
    options.snapshotSigningSecret ??
    process.env.SNAPSHOT_SIGNING_SECRET ??
    'dev-snapshot-signing-secret';
  const snapshotValidityMs =
    options.snapshotValidityMs ??
    getNumberEnv('SNAPSHOT_VALIDITY_MS', defaultSnapshotValidityMs);
  const providerCacheTtlMs =
    options.providerCacheTtlMs ??
    getNumberEnv('PROVIDER_CACHE_TTL_MS', defaultProviderCacheTtlMs);
  const guessEligibilityMs =
    options.guessEligibilityMs ??
    getNumberEnv('GUESS_ELIGIBILITY_MS', defaultGuessEligibilityMs);
  const players = options.players ?? new Map<string, Player>();

  let cachedPrice:
    | {
        priceUsd: number;
        fetchedAtMs: number;
      }
    | undefined;

  const getPrice = async (): Promise<number> => {
    const nowMs = now().getTime();

    if (
      cachedPrice !== undefined &&
      nowMs - cachedPrice.fetchedAtMs < providerCacheTtlMs
    ) {
      return cachedPrice.priceUsd;
    }

    try {
      const priceUsd = await priceProvider();
      cachedPrice = { priceUsd, fetchedAtMs: nowMs };
      return priceUsd;
    } catch {
      throw new ApiError(503, 'PRICE_PROVIDER_UNAVAILABLE');
    }
  };

  const getOrCreatePlayer = (userId: string): Player => {
    const existingPlayer = players.get(userId);

    if (existingPlayer !== undefined) {
      return existingPlayer;
    }

    const timestamp = now().toISOString();
    const player: Player = {
      userId,
      score: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    players.set(userId, player);
    return player;
  };

  const requireUserId = (event: ApiGatewayEvent): string => {
    const userId = getHeader(event.headers, 'x-user-id')?.trim();

    if (!userId) {
      throw new ApiError(401, 'MISSING_USER_ID');
    }

    return userId;
  };

  const createPriceSnapshot = async (): Promise<PriceSnapshot> => {
    const priceUsd = await getPrice();
    const issuedAt = now();
    const expiresAt = new Date(issuedAt.getTime() + snapshotValidityMs);
    const payload: SnapshotPayload = {
      priceUsd,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    return {
      ...payload,
      priceSnapshotId: createSnapshotToken(payload, snapshotSigningSecret),
    };
  };

  const handleState = async (event: ApiGatewayEvent): Promise<Response> => {
    const userId = requireUserId(event);
    const priceSnapshot = await createPriceSnapshot();
    const player = getOrCreatePlayer(userId);
    const body: GameStateResponse = {
      ...toPublicPlayer(player),
      priceSnapshot,
    };

    return respond(200, body);
  };

  const handleCreateGuess = async (
    event: ApiGatewayEvent,
  ): Promise<Response> => {
    const userId = requireUserId(event);
    const request = parseBody<CreateGuessRequest>(event);

    if (
      !isGuessDirection(request.direction) ||
      typeof request.priceSnapshotId !== 'string'
    ) {
      throw new ApiError(422, 'INVALID_REQUEST');
    }

    const snapshot = parseSnapshotToken(
      request.priceSnapshotId,
      snapshotSigningSecret,
      now(),
    );
    const player = getOrCreatePlayer(userId);

    if (player.activeGuess !== undefined) {
      throw new ApiError(409, 'ACTIVE_GUESS_EXISTS');
    }

    const createdAt = now();
    player.activeGuess = {
      direction: request.direction,
      startPriceUsd: snapshot.priceUsd,
      createdAt: createdAt.toISOString(),
      eligibleAt: new Date(
        createdAt.getTime() + guessEligibilityMs,
      ).toISOString(),
    };
    player.updatedAt = createdAt.toISOString();

    const body: CreateGuessResponse = {
      userId: player.userId,
      score: player.score,
      activeGuess: player.activeGuess,
    };

    return respond(200, body);
  };

  const handleResolveGuess = async (
    event: ApiGatewayEvent,
  ): Promise<Response> => {
    const userId = requireUserId(event);
    const player = getOrCreatePlayer(userId);
    const activeGuess = player.activeGuess;

    if (activeGuess === undefined) {
      throw new ApiError(409, 'NO_ACTIVE_GUESS');
    }

    if (Date.parse(activeGuess.eligibleAt) > now().getTime()) {
      const body: ResolveGuessResponse = {
        status: 'NOT_READY',
        ...toPublicPlayer(player),
      };
      return respond(200, body);
    }

    const observedPriceUsd = await getPrice();

    if (observedPriceUsd === activeGuess.startPriceUsd) {
      const body: ResolveGuessResponse = {
        status: 'PRICE_UNCHANGED',
        ...toPublicPlayer(player),
      };
      return respond(200, body);
    }

    const guessedCorrectly =
      activeGuess.direction === 'up'
        ? observedPriceUsd > activeGuess.startPriceUsd
        : observedPriceUsd < activeGuess.startPriceUsd;

    player.score += guessedCorrectly ? 1 : -1;
    delete player.activeGuess;
    player.updatedAt = now().toISOString();

    const body: ResolveGuessResponse = {
      status: 'RESOLVED',
      ...toPublicPlayer(player),
    };

    return respond(200, body);
  };

  return async (event: ApiGatewayEvent = {}): Promise<Response> => {
    const method = event.requestContext?.http?.method ?? 'GET';
    const path = event.rawPath ?? event.requestContext?.http?.path ?? '/health';

    try {
      if (method === 'GET' && path === '/health') {
        const body: HealthResponse = { status: 'ok' };
        return respond(200, body);
      }

      if (method === 'GET' && path === '/state') {
        return await handleState(event);
      }

      if (method === 'POST' && path === '/guesses') {
        return await handleCreateGuess(event);
      }

      if (method === 'POST' && path === '/guesses/resolve') {
        return await handleResolveGuess(event);
      }

      return respondError(404, 'INVALID_REQUEST', { method, path });
    } catch (error) {
      if (error instanceof ApiError) {
        return respondError(error.statusCode, error.code, error.details);
      }

      return respondError(500, 'INVALID_REQUEST');
    }
  };
};

export const handler = createHandler();

export { createHandler };
