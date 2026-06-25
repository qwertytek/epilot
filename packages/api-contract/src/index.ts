export type GuessDirection = 'up' | 'down';

export type ResolveGuessStatus = 'RESOLVED' | 'NOT_READY' | 'PRICE_UNCHANGED';

export type ApiErrorCode =
  | 'MISSING_USER_ID'
  | 'ACTIVE_GUESS_EXISTS'
  | 'NO_ACTIVE_GUESS'
  | 'PRICE_SNAPSHOT_EXPIRED'
  | 'INVALID_REQUEST'
  | 'PRICE_SNAPSHOT_INVALID'
  | 'PRICE_PROVIDER_UNAVAILABLE';

export type HealthResponse = {
  status: 'ok';
};

export type PriceSnapshot = {
  priceSnapshotId: string;
  priceUsd: number;
  issuedAt: string;
  expiresAt: string;
};

export type ActiveGuess = {
  direction: GuessDirection;
  startPriceUsd: number;
  createdAt: string;
  eligibleAt: string;
};

export type GameStateResponse = {
  userId: string;
  score: number;
  priceSnapshot: PriceSnapshot;
  activeGuess?: ActiveGuess;
};

export type CreateGuessRequest = {
  direction: GuessDirection;
  priceSnapshotId: string;
};

export type CreateGuessResponse = {
  userId: string;
  score: number;
  activeGuess: ActiveGuess;
};

export type ResolveGuessResponse = {
  status: ResolveGuessStatus;
  userId: string;
  score: number;
  activeGuess?: ActiveGuess;
};

export type ApiErrorResponse = {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};
