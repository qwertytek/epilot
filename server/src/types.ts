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

export type PriceProvider = () => Promise<number>;

export type HandlerOptions = {
  now?: () => Date;
  priceProvider?: PriceProvider;
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
