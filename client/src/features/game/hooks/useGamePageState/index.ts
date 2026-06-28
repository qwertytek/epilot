import { useResolveCountdown } from '../../../../hooks/useResolveCountdown.js';
import { toGamePageViewModel } from '../../game.view-model.js';
import { useGameNotifications } from './useGameNotifications.js';
import { useGamePriceState } from './useGamePriceState.js';
import { useGameSession } from './useGameSession.js';
import { useGuessSubmission } from './useGuessSubmission.js';
import { usePriceAnimation } from '../usePriceAnimation.js';

export const useGamePageState = () => {
  const session = useGameSession();
  const price = useGamePriceState();
  const notifications = useGameNotifications({
    createGuessMutation: session.createGuessMutation,
    gameState: session.gameState,
    gameStateQuery: session.gameStateQuery,
    priceStateQuery: price.priceStateQuery,
  });
  const guess = useGuessSubmission({
    activeGuess: session.activeGuess,
    currentPrice: price.currentPrice,
    createGuessMutation: session.createGuessMutation,
    dismissPersistentWarnings: notifications.dismissPersistentWarnings,
    gameState: session.gameState,
    gameStateQuery: session.gameStateQuery,
    canUsePrice: price.canUsePrice,
    isInitialPriceLoading: price.isInitialPriceLoading,
    isPriceUnavailable: price.isPriceUnavailable,
    priceStateQuery: price.priceStateQuery,
  });
  const { resolveWaitSeconds } = useResolveCountdown(session.activeGuess);
  const resolvedOutcome =
    session.gameState?.feedback.type === 'RESOLVED'
      ? session.gameState.feedback.outcome
      : undefined;
  const priceAnimation = usePriceAnimation({
    activeGuess: session.activeGuess,
    currentPrice: price.currentPrice,
    resolvedOutcome,
    resolvedPrice: session.resolvedPrice,
  });

  return toGamePageViewModel({
    guess,
    notifications,
    price,
    priceAnimation,
    resolveWaitSeconds,
    session,
  });
};
