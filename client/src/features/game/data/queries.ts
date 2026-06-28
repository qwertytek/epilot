import { useEffect } from 'react';
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  GameStateResponse,
  GuessDirection,
  PriceSnapshot,
  PriceStateResponse,
} from '@epilot/api-contract';

import {
  createGuess,
  getGameState,
  getPriceState,
} from '#src/features/game/data/api';
import { getAnonymousUserId } from '#src/api/identity';
import { ApiError } from '#src/api/http';
import { pricePollIntervalMs } from '#src/shared/constants/pricePoll';

const optimisticGuessEligibilityMs = 60_000;
const gameKeys = {
  all: ['game'] as const,
  players: () => [...gameKeys.all, 'players'] as const,
  player: (userId: string) => [...gameKeys.players(), userId] as const,
  state: (userId: string) => [...gameKeys.player(userId), 'state'] as const,
  price: () => [...gameKeys.all, 'price'] as const,
  guesses: (userId: string) => [...gameKeys.player(userId), 'guesses'] as const,
};

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

const getLatestPriceFromExpiredSnapshotError = (
  error: unknown,
): PriceSnapshot | null => {
  if (
    !(error instanceof ApiError) ||
    error.error.error.code !== 'PRICE_SNAPSHOT_EXPIRED'
  ) {
    return null;
  }

  const details = error.error.error.details;

  if (typeof details !== 'object' || details === null) {
    return null;
  }

  const latestPrice = (details as Record<string, unknown>).latestPrice;

  return isPriceSnapshot(latestPrice) ? latestPrice : null;
};

const createGameStateQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: gameKeys.state(userId),
    queryFn: getGameState,
    refetchInterval: (query) => {
      const activeGuess = query.state.data?.activeGuess;

      if (!activeGuess) {
        return false;
      }

      const waitMs = Date.parse(activeGuess.eligibleAt) - Date.now();

      return waitMs > 0 ? Math.max(waitMs, 1_000) : 3_000;
    },
  });

const createPriceStateQueryOptions = (enabled: boolean) =>
  queryOptions({
    queryKey: gameKeys.price(),
    queryFn: ({ signal }) => getPriceState(signal),
    enabled,
    refetchInterval: pricePollIntervalMs,
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

const useGameStateQuery = (userId = getAnonymousUserId()) => {
  const queryClient = useQueryClient();
  const query = useQuery(createGameStateQueryOptions(userId));
  const latestPrice = query.data?.latestPrice;

  useEffect(() => {
    if (latestPrice === undefined) {
      return;
    }

    queryClient.setQueryData<PriceStateResponse>(gameKeys.price(), {
      price: latestPrice,
      canCreateGuess: query.data?.latestPriceCanCreateGuess === true,
    });
  }, [latestPrice, query.data?.latestPriceCanCreateGuess, queryClient]);

  return query;
};

const usePriceStateQuery = (enabled: boolean) =>
  useQuery(createPriceStateQueryOptions(enabled));

const useCreateGuessMutation = (userId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...gameKeys.guesses(userId), 'create'],
    mutationFn: ({
      direction,
      priceSnapshotId,
    }: {
      direction: GuessDirection;
      priceSnapshotId: string;
    }) => createGuess(direction, priceSnapshotId),
    onMutate: async ({ direction }) => {
      await queryClient.cancelQueries({ queryKey: gameKeys.state(userId) });
      await queryClient.cancelQueries({ queryKey: gameKeys.price() });

      const previousState = queryClient.getQueryData<GameStateResponse>(
        gameKeys.state(userId),
      );
      const previousPriceState = queryClient.getQueryData<PriceStateResponse>(
        gameKeys.price(),
      );

      if (
        previousState?.activeGuess === null &&
        previousPriceState?.price !== null &&
        previousPriceState?.canCreateGuess === true
      ) {
        const createdAt = new Date();

        queryClient.setQueryData<GameStateResponse>(gameKeys.state(userId), {
          ...previousState,
          activeGuess: {
            id: 'optimistic-guess',
            direction,
            startPriceUsd: previousPriceState.price.priceUsd,
            createdAt: createdAt.toISOString(),
            eligibleAt: new Date(
              createdAt.getTime() + optimisticGuessEligibilityMs,
            ).toISOString(),
          },
          lastBet: {
            direction,
            priceUsd: previousPriceState.price.priceUsd,
            placedAt: createdAt.toISOString(),
          },
          feedback: {
            type: 'NONE',
          },
        });
      }

      return { previousState, previousPriceState };
    },
    onError: (error, _variables, context) => {
      if (context?.previousState) {
        const latestPrice = getLatestPriceFromExpiredSnapshotError(error);

        queryClient.setQueryData(gameKeys.state(userId), context.previousState);

        if (latestPrice !== null) {
          queryClient.setQueryData<PriceStateResponse>(gameKeys.price(), {
            price: latestPrice,
            canCreateGuess: true,
          });
        } else if (context.previousPriceState) {
          queryClient.setQueryData(
            gameKeys.price(),
            context.previousPriceState,
          );
        }
      }
    },
    onSuccess: (state) => {
      queryClient.setQueryData(gameKeys.state(userId), state);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: gameKeys.state(userId) });
    },
  });
};

export {
  createGameStateQueryOptions,
  createPriceStateQueryOptions,
  gameKeys,
  useCreateGuessMutation,
  useGameStateQuery,
  usePriceStateQuery,
};
