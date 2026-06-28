import type {
  CreateGuessRequest,
  CreateGuessResponse,
  GameStateResponse,
  GuessDirection,
  PriceSnapshot,
  PriceStateResponse,
  ResolveGuessResponse,
} from '@epilot/api-contract';

import { requestApi } from '../../../api/http.js';

const getGameState = (): Promise<GameStateResponse> => requestApi('/state');

const isPriceSnapshot = (value: unknown): value is PriceSnapshot => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const snapshot = value as Record<string, unknown>;

  return (
    typeof snapshot.priceSnapshotId === 'string' &&
    typeof snapshot.priceUsd === 'number' &&
    Number.isFinite(snapshot.priceUsd) &&
    typeof snapshot.observedAt === 'string'
  );
};

const isPriceStateResponse = (value: unknown): value is PriceStateResponse => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const response = value as Record<string, unknown>;

  return (
    (response.price === null || isPriceSnapshot(response.price)) &&
    typeof response.canCreateGuess === 'boolean'
  );
};

const normalizePriceState = (response: unknown): PriceStateResponse => {
  if (isPriceStateResponse(response)) {
    return response;
  }

  if (typeof response === 'object' && response !== null) {
    const legacyLatestPrice = (response as Record<string, unknown>).latestPrice;

    if (isPriceSnapshot(legacyLatestPrice)) {
      return {
        price: legacyLatestPrice,
        canCreateGuess: true,
      };
    }
  }

  return {
    price: null,
    canCreateGuess: false,
  };
};

const getPriceState = async (
  signal?: AbortSignal,
): Promise<PriceStateResponse> =>
  normalizePriceState(await requestApi<unknown>('/price', { signal }));

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
