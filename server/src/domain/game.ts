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
    const player = await players.getOrCreate(userId);

    return {
      ...players.toPublicState(player),
      priceSnapshot,
    };
  };

  const createGuess = async (
    userId: string,
    request: CreateGuessRequest,
  ): Promise<CreateGuessResponse> => {
    const snapshot = parsePriceSnapshot(request.priceSnapshotId);
    const createdAt = now();
    const createdAtIso = createdAt.toISOString();
    const player = await players
      .createGuess(userId, {
        direction: request.direction,
        startPriceUsd: snapshot.priceUsd,
        createdAt: createdAtIso,
        eligibleAt: new Date(
          createdAt.getTime() + guessEligibilityMs,
        ).toISOString(),
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.message === 'ACTIVE_GUESS_EXISTS') {
          throw new ApiError(409, 'ACTIVE_GUESS_EXISTS');
        }

        throw error;
      });
    const state = players.toPublicState(player);

    if (state.activeGuess === undefined) {
      throw new ApiError(409, 'NO_ACTIVE_GUESS');
    }

    return {
      userId: state.userId,
      score: state.score,
      activeGuess: state.activeGuess,
    };
  };

  const resolveGuess = async (
    userId: string,
  ): Promise<ResolveGuessResponse> => {
    const player = await players.getOrCreate(userId);
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

    const resolvedPlayer = await players
      .resolveGuess(userId, {
        activeGuess,
        scoreDelta: guessedCorrectly ? 1 : -1,
        updatedAt: now().toISOString(),
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.message === 'NO_ACTIVE_GUESS') {
          throw new ApiError(409, 'NO_ACTIVE_GUESS');
        }

        throw error;
      });

    return {
      status: 'RESOLVED',
      ...players.toPublicState(resolvedPlayer),
    };
  };

  return { getState, createGuess, resolveGuess };
};
