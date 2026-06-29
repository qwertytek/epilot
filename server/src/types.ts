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

export type PriceProvider = (() => Promise<number>) & {
  getFreshPrice?: () => Promise<number>;
  getLastFetchedAtMs?: () => number | undefined;
  getLastReturnedWasStaleFallback?: () => boolean;
  getCachedPrice?: () =>
    | {
        priceUsd: number;
        fetchedAtMs: number;
      }
    | undefined;
};

export type InternalPriceSnapshot = PriceSnapshot & {
  canCreateGuess: boolean;
  isStaleFallback?: boolean;
};

export type PriceSnapshotFactory = (() => Promise<InternalPriceSnapshot>) & {
  createFreshSnapshot?: () => Promise<InternalPriceSnapshot>;
  getCachedSnapshot?: () => InternalPriceSnapshot | undefined;
};

export type HandlerOptions = {
  now?: () => Date;
  priceProvider?: PriceProvider;
  onPriceProviderError?: (error: unknown) => void;
  coinGeckoPriceUrl?: string;
  corsAllowedOrigins?: string[];
  snapshotSigningSecret?: string;
  snapshotValidityMs?: number;
  providerCacheTtlMs?: number;
  guessEligibilityMs?: number;
  players?: Map<string, Player>;
  playerStore?: PlayerStore;
  playerTableName?: string;
  dynamoDbEndpoint?: string;
  awsRegion?: string;
};
