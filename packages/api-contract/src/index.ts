export type GuessDirection = 'UP' | 'DOWN';

export type Feedback =
  | {
      type: 'NONE';
    }
  | {
      type: 'GUESS_CREATED';
    }
  | {
      type: 'NOT_READY';
      retryAt: string;
    }
  | {
      type: 'PRICE_UNCHANGED';
    }
  | {
      type: 'RESOLUTION_PENDING';
    }
  | {
      type: 'RESOLVED';
      outcome: 'CORRECT' | 'INCORRECT';
      scoreDelta: 1 | -1;
    };

export type ApiErrorCode =
  | 'MISSING_USER_ID'
  | 'INVALID_USER_ID'
  | 'ACTIVE_GUESS_EXISTS'
  | 'NO_ACTIVE_GUESS'
  | 'PRICE_SNAPSHOT_EXPIRED'
  | 'PRICE_SNAPSHOT_NOT_GUESSABLE'
  | 'INVALID_REQUEST'
  | 'PRICE_SNAPSHOT_INVALID'
  | 'PRICE_PROVIDER_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export type HealthResponse = {
  status: 'ok';
};

export type PriceSnapshot = {
  priceSnapshotId: string;
  priceUsd: number;
  observedAt: string;
};

export type ActiveGuess = {
  id: string;
  direction: GuessDirection;
  startPriceUsd: number;
  createdAt: string;
  eligibleAt: string;
};

export type LastBet = {
  direction: GuessDirection;
  priceUsd: number;
  placedAt: string;
};

export type GameStateResponse = {
  score: number;
  activeGuess: ActiveGuess | null;
  lastBet: LastBet | null;
  feedback: Feedback;
  latestPrice?: PriceSnapshot;
  latestPriceCanCreateGuess?: boolean;
};

export type PriceStateResponse = {
  price: PriceSnapshot | null;
  canCreateGuess: boolean;
};

export type CreateGuessRequest = {
  direction: GuessDirection;
  priceSnapshotId: string;
};

export type CreateGuessResponse = GameStateResponse;

export type ResolveGuessResponse = GameStateResponse;

export type ApiErrorResponse = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};
