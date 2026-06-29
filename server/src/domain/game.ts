import type {
  CreateGuessRequest,
  CreateGuessResponse,
  GameStateResponse,
  PriceSnapshot,
  PriceStateResponse,
  ResolveGuessResponse,
} from '@epilot/api-contract';

import { ApiError } from '../errors.js';
import type { PlayerStore } from './player-store.js';
import type { InternalPriceSnapshot, PriceSnapshotFactory } from '../types.js';

export type GameService = ReturnType<typeof createGameService>;

const toPublicPriceSnapshot = ({
  priceSnapshotId,
  priceUsd,
  observedAt,
}: InternalPriceSnapshot): PriceSnapshot => ({
  priceSnapshotId,
  priceUsd,
  observedAt,
});

export const createGameService = ({
  players,
  now,
  createPriceSnapshot,
  parsePriceSnapshot,
  guessEligibilityMs,
}: {
  players: PlayerStore;
  now: () => Date;
  createPriceSnapshot: PriceSnapshotFactory;
  parsePriceSnapshot: (
    priceSnapshotId: string,
  ) => Omit<InternalPriceSnapshot, 'priceSnapshotId'>;
  guessEligibilityMs: number;
}) => {
  const resolveReadyGuess = async (
    userId: string,
    player: Awaited<ReturnType<PlayerStore['getOrCreate']>>,
    activeGuess: NonNullable<
      Awaited<ReturnType<PlayerStore['getOrCreate']>>['activeGuess']
    >,
  ): Promise<ResolveGuessResponse> => {
    let internalLatestPrice: InternalPriceSnapshot;

    try {
      internalLatestPrice = await createPriceSnapshot();
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === 'PRICE_PROVIDER_UNAVAILABLE'
      ) {
        return {
          ...players.toPublicState(player),
          feedback: {
            type: 'RESOLUTION_PENDING',
          },
        };
      }

      throw error;
    }

    let latestPrice = toPublicPriceSnapshot(internalLatestPrice);

    if (
      internalLatestPrice.canCreateGuess &&
      Date.parse(latestPrice.observedAt) < Date.parse(activeGuess.eligibleAt) &&
      createPriceSnapshot.createFreshSnapshot !== undefined
    ) {
      try {
        internalLatestPrice = await createPriceSnapshot.createFreshSnapshot();
        latestPrice = toPublicPriceSnapshot(internalLatestPrice);
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.code === 'PRICE_PROVIDER_UNAVAILABLE'
        ) {
          return {
            ...players.toPublicState(player),
            latestPrice,
            latestPriceCanCreateGuess: internalLatestPrice.canCreateGuess,
            feedback: {
              type: 'RESOLUTION_PENDING',
            },
          };
        }

        throw error;
      }
    }

    const observedPriceUsd = latestPrice.priceUsd;

    if (
      !internalLatestPrice.canCreateGuess ||
      Date.parse(latestPrice.observedAt) < Date.parse(activeGuess.eligibleAt)
    ) {
      return {
        ...players.toPublicState(player),
        latestPrice,
        latestPriceCanCreateGuess: internalLatestPrice.canCreateGuess,
        feedback: {
          type: 'RESOLUTION_PENDING',
        },
      };
    }

    if (observedPriceUsd === activeGuess.startPriceUsd) {
      return {
        ...players.toPublicState(player),
        latestPrice,
        latestPriceCanCreateGuess: internalLatestPrice.canCreateGuess,
        feedback: {
          type: 'PRICE_UNCHANGED',
        },
      };
    }

    const guessedCorrectly =
      activeGuess.direction === 'UP'
        ? observedPriceUsd > activeGuess.startPriceUsd
        : observedPriceUsd < activeGuess.startPriceUsd;
    const scoreDelta = guessedCorrectly ? 1 : -1;

    const resolvedPlayer = await players
      .resolveGuess(userId, {
        activeGuess,
        scoreDelta,
        updatedAt: now().toISOString(),
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.message === 'NO_ACTIVE_GUESS') {
          throw new ApiError(409, 'NO_ACTIVE_GUESS');
        }

        throw error;
      });

    return {
      ...players.toPublicState(resolvedPlayer),
      latestPrice,
      latestPriceCanCreateGuess: internalLatestPrice.canCreateGuess,
      feedback: {
        type: 'RESOLVED',
        outcome: guessedCorrectly ? 'CORRECT' : 'INCORRECT',
        scoreDelta,
      },
    };
  };

  const getState = async (userId: string): Promise<GameStateResponse> => {
    const player = await players.getOrCreate(userId);
    const activeGuess = player.activeGuess;

    if (
      activeGuess !== undefined &&
      Date.parse(activeGuess.eligibleAt) <= now().getTime()
    ) {
      const resolvedState = await resolveReadyGuess(
        userId,
        player,
        activeGuess,
      );

      return resolvedState;
    }

    return {
      ...players.toPublicState(player),
      feedback: {
        type: 'NONE',
      },
    };
  };

  const getPriceState = async (): Promise<PriceStateResponse> => {
    try {
      const price = await createPriceSnapshot();

      return {
        price: toPublicPriceSnapshot(price),
        canCreateGuess: price.canCreateGuess,
      };
    } catch (error) {
      if (
        !(error instanceof ApiError) ||
        error.code !== 'PRICE_PROVIDER_UNAVAILABLE'
      ) {
        throw error;
      }

      return {
        price: null,
        canCreateGuess: false,
      };
    }
  };

  const createGuess = async (
    userId: string,
    request: CreateGuessRequest,
  ): Promise<CreateGuessResponse> => {
    let snapshot: Omit<InternalPriceSnapshot, 'priceSnapshotId'>;

    try {
      snapshot = parsePriceSnapshot(request.priceSnapshotId);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === 'PRICE_SNAPSHOT_EXPIRED'
      ) {
        const latestPrice = await createPriceSnapshot();

        throw new ApiError(410, 'PRICE_SNAPSHOT_EXPIRED', {
          latestPrice: toPublicPriceSnapshot(latestPrice),
        });
      }

      throw error;
    }

    if (!snapshot.canCreateGuess) {
      throw new ApiError(409, 'PRICE_SNAPSHOT_NOT_GUESSABLE');
    }

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

    if (state.activeGuess === null) {
      throw new ApiError(409, 'NO_ACTIVE_GUESS');
    }

    return {
      ...state,
      feedback: {
        type: 'GUESS_CREATED',
      },
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
        ...players.toPublicState(player),
        feedback: {
          type: 'NOT_READY',
          retryAt: activeGuess.eligibleAt,
        },
      };
    }

    return resolveReadyGuess(userId, player, activeGuess);
  };

  return { getPriceState, getState, createGuess, resolveGuess };
};
