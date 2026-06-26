import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { GameStateResponse, GuessDirection } from '@epilot/api-contract';

import { createGuess, getGameState } from './game.api.js';
import { getAnonymousUserId } from '../../api/identity.js';

const optimisticGuessEligibilityMs = 60_000;

const gameKeys = {
  all: ['game'] as const,
  players: () => [...gameKeys.all, 'players'] as const,
  player: (userId: string) => [...gameKeys.players(), userId] as const,
  state: (userId: string) => [...gameKeys.player(userId), 'state'] as const,
  guesses: (userId: string) => [...gameKeys.player(userId), 'guesses'] as const,
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

const useGameStateQuery = (userId = getAnonymousUserId()) =>
  useQuery(createGameStateQueryOptions(userId));

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

      const previousState = queryClient.getQueryData<GameStateResponse>(
        gameKeys.state(userId),
      );

      if (previousState?.activeGuess === null) {
        const createdAt = new Date();

        queryClient.setQueryData<GameStateResponse>(gameKeys.state(userId), {
          ...previousState,
          activeGuess: {
            id: 'optimistic-guess',
            direction,
            startPriceUsd: previousState.latestPrice.priceUsd,
            createdAt: createdAt.toISOString(),
            eligibleAt: new Date(
              createdAt.getTime() + optimisticGuessEligibilityMs,
            ).toISOString(),
          },
          feedback: {
            type: 'GUESS_CREATED',
          },
        });
      }

      return { previousState };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousState) {
        queryClient.setQueryData(gameKeys.state(userId), context.previousState);
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
  gameKeys,
  useCreateGuessMutation,
  useGameStateQuery,
};
