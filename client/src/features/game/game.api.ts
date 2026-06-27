import type {
  CreateGuessRequest,
  CreateGuessResponse,
  GameStateResponse,
  GuessDirection,
  PriceStateResponse,
  ResolveGuessResponse,
} from '@epilot/api-contract';

import { requestApi } from '../../api/http.js';

const getGameState = (): Promise<GameStateResponse> => requestApi('/state');

const getPriceState = (signal?: AbortSignal): Promise<PriceStateResponse> =>
  requestApi('/price', { signal });

const createGuess = (
  direction: GuessDirection,
  priceSnapshotId: string,
): Promise<CreateGuessResponse> => {
  const body: CreateGuessRequest = {
    direction,
    priceSnapshotId,
  };

  return requestApi('/guesses', {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

const resolveGuess = (): Promise<ResolveGuessResponse> =>
  requestApi('/guesses/resolve', {
    method: 'POST',
  });

export { createGuess, getGameState, getPriceState, resolveGuess };
