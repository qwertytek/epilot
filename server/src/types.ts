import type { PriceSnapshot } from '@epilot/api-contract';
import type { Player } from './domain/player-store.js';
import type { PlayerStore } from './domain/player-store.js';

export type ApiGatewayEvent = {
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

export type Response = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

export type PriceProviderOptions = {
  allowStale?: boolean;
  maxAgeMs?: number;
};

export type PriceProvider = ((
  options?: PriceProviderOptions,
) => Promise<number>) & {
  getLastFetchedAtMs?: () => number | undefined;
  getCachedPrice?: () =>
    | {
        priceUsd: number;
        fetchedAtMs: number;
      }
    | undefined;
  getRetryAfterMs?: () => number | undefined;
};

export type PriceSnapshotFactory = ((
  options?: PriceProviderOptions,
) => Promise<PriceSnapshot>) & {
  getCachedSnapshot?: () => PriceSnapshot | undefined;
  getRetryAfterMs?: () => number | undefined;
};

export type HandlerOptions = {
  now?: () => Date;
  priceProvider?: PriceProvider;
  coinGeckoPriceUrl?: string;
  corsAllowedOrigins?: string[];
  snapshotSigningSecret?: string;
  snapshotValidityMs?: number;
  providerCacheTtlMs?: number;
  providerFailureCooldownMs?: number;
  guessEligibilityMs?: number;
  players?: Map<string, Player>;
  playerStore?: PlayerStore;
  playerTableName?: string;
  dynamoDbEndpoint?: string;
  awsRegion?: string;
};
