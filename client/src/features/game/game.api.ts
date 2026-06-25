import type {
  ApiErrorResponse,
  CreateGuessRequest,
  CreateGuessResponse,
  GameStateResponse,
  GuessDirection,
  ResolveGuessResponse,
} from '@epilot/api-contract';

const userIdStorageKey = 'btc-game.user-id';
const apiBaseUrl =
  (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env
    ?.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000';

class GameApiError extends Error {
  constructor(
    readonly status: number,
    readonly error: ApiErrorResponse,
  ) {
    super(error.error.message);
  }
}

const getAnonymousUserId = (): string => {
  const existingUserId = localStorage.getItem(userIdStorageKey);

  if (existingUserId) {
    return existingUserId;
  }

  const userId = crypto.randomUUID();
  localStorage.setItem(userIdStorageKey, userId);
  return userId;
};

const requestGameApi = async <T>(
  path: string,
  init: RequestInit = {},
): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-user-id': getAnonymousUserId(),
      ...init.headers,
    },
  });

  const body = (await response.json()) as T | ApiErrorResponse;

  if (!response.ok) {
    throw new GameApiError(response.status, body as ApiErrorResponse);
  }

  return body as T;
};

const getGameState = (): Promise<GameStateResponse> => requestGameApi('/state');

const createGuess = (
  direction: GuessDirection,
  priceSnapshotId: string,
): Promise<CreateGuessResponse> => {
  const body: CreateGuessRequest = {
    direction,
    priceSnapshotId,
  };

  return requestGameApi('/guesses', {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

const resolveGuess = (): Promise<ResolveGuessResponse> =>
  requestGameApi('/guesses/resolve', {
    method: 'POST',
  });

export {
  GameApiError,
  createGuess,
  getAnonymousUserId,
  getGameState,
  resolveGuess,
};
