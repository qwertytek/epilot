import type {
  CreateGuessRequest,
  CreateGuessResponse,
  GameStateResponse,
  PriceSnapshot,
  ResolveGuessResponse,
} from '@epilot/api-contract';

import { ApiError } from '../errors.js';
import type { PlayerStore } from './player-store.js';
import type { PriceProvider } from '../types.js';

export type GameService = ReturnType<typeof createGameService>;

export const createGameService = ({
  players,
  now,
  getPrice,
  createPriceSnapshot,
  parsePriceSnapshot,
  guessEligibilityMs,
}: {
  players: PlayerStore;
  now: () => Date;
  getPrice: PriceProvider;
  createPriceSnapshot: () => Promise<PriceSnapshot>;
  parsePriceSnapshot: (priceSnapshotId: string) => { priceUsd: number };
  guessEligibilityMs: number;
}) => {
  const getState = async (userId: string): Promise<GameStateResponse> => {
    const priceSnapshot = await createPriceSnapshot();
    const player = players.getOrCreate(userId);

    return {
      ...players.toPublicState(player),
      priceSnapshot,
    };
  };

  const createGuess = (
    userId: string,
    request: CreateGuessRequest,
  ): CreateGuessResponse => {
    const snapshot = parsePriceSnapshot(request.priceSnapshotId);
    const player = players.getOrCreate(userId);

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

    return {
      userId: player.userId,
      score: player.score,
      activeGuess: player.activeGuess,
    };
  };

  const resolveGuess = async (
    userId: string,
  ): Promise<ResolveGuessResponse> => {
    const player = players.getOrCreate(userId);
    const activeGuess = player.activeGuess;

    if (activeGuess === undefined) {
      throw new ApiError(409, 'NO_ACTIVE_GUESS');
    }

    if (Date.parse(activeGuess.eligibleAt) > now().getTime()) {
      return {
        status: 'NOT_READY',
        ...players.toPublicState(player),
      };
    }

    const observedPriceUsd = await getPrice();

    if (observedPriceUsd === activeGuess.startPriceUsd) {
      return {
        status: 'PRICE_UNCHANGED',
        ...players.toPublicState(player),
      };
    }

    const guessedCorrectly =
      activeGuess.direction === 'up'
        ? observedPriceUsd > activeGuess.startPriceUsd
        : observedPriceUsd < activeGuess.startPriceUsd;

    player.score += guessedCorrectly ? 1 : -1;
    delete player.activeGuess;
    player.updatedAt = now().toISOString();

    return {
      status: 'RESOLVED',
      ...players.toPublicState(player),
    };
  };

  return { getState, createGuess, resolveGuess };
};
