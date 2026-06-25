import {
  defaultCoinGeckoPriceUrl,
  defaultCorsAllowedOrigins,
  defaultGuessEligibilityMs,
  defaultProviderCacheTtlMs,
  defaultSnapshotValidityMs,
  getArrayEnv,
  getNumberEnv,
} from './config.js';
import { createGameService } from './domain/game.js';
import { createPlayerStore } from './domain/player-store.js';
import { createDynamoDbPlayerStore } from './infra/dynamodb-player-store.js';
import { createHttpResponder } from './infra/http.js';
import {
  createCachedPriceProvider,
  createCoinGeckoPriceProvider,
} from './infra/price-provider.js';
import {
  createPriceSnapshotFactory,
  parseSnapshotToken,
} from './infra/snapshots.js';
import type { HandlerOptions } from './types.js';

export const createAppContext = (options: HandlerOptions = {}) => {
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
  const corsAllowedOrigins =
    options.corsAllowedOrigins ??
    getArrayEnv('CORS_ALLOWED_ORIGINS', defaultCorsAllowedOrigins);
  const playerTableName =
    options.playerTableName ?? process.env.PLAYER_TABLE_NAME;
  const dynamoDbEndpoint =
    (options.dynamoDbEndpoint ?? process.env.DYNAMODB_ENDPOINT) || undefined;
  const awsRegion =
    options.awsRegion ?? process.env.AWS_REGION ?? process.env.REGION;

  const http = createHttpResponder(corsAllowedOrigins);
  const getPrice = createCachedPriceProvider(
    priceProvider,
    now,
    providerCacheTtlMs,
  );
  const createPriceSnapshot = createPriceSnapshotFactory(
    getPrice,
    now,
    snapshotValidityMs,
    snapshotSigningSecret,
  );
  const players =
    options.playerStore ??
    (playerTableName === undefined
      ? createPlayerStore(options.players ?? new Map(), now)
      : createDynamoDbPlayerStore({
          tableName: playerTableName,
          endpoint: dynamoDbEndpoint,
          region: awsRegion,
          now,
        }));
  const game = createGameService({
    players,
    now,
    getPrice,
    createPriceSnapshot,
    parsePriceSnapshot: (priceSnapshotId) =>
      parseSnapshotToken(priceSnapshotId, snapshotSigningSecret, now()),
    guessEligibilityMs,
  });

  return { game, http };
};
