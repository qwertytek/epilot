import { getAnonymousUserId } from '#src/api/identity';
import {
  useCreateGuessMutation,
  useGameStateQuery,
} from '#src/features/game/data/queries';

export const useGameSession = () => {
  const userId = getAnonymousUserId();
  const gameStateQuery = useGameStateQuery(userId);

  return {
    activeGuess: gameStateQuery.data?.activeGuess ?? null,
    createGuessMutation: useCreateGuessMutation(userId),
    gameState: gameStateQuery.data ?? null,
    gameStateQuery,
    isGameStateKnown: gameStateQuery.data !== undefined,
    resolvedPrice: gameStateQuery.data?.latestPrice ?? null,
  };
};
