import { getAnonymousUserId } from '../../../../api/identity.js';
import {
  useCreateGuessMutation,
  useGameStateQuery,
} from '../../model/game.queries';

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
