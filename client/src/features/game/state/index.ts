import { useResolveCountdown } from '#src/hooks/useResolveCountdown';
import { useGameNotifications } from './hooks/useGameNotifications';
import { useGamePriceState } from './hooks/useGamePriceState';
import { useGameSession } from './hooks/useGameSession';
import { useGuessSubmission } from './hooks/useGuessSubmission';
import { usePriceAnimation } from './hooks/usePriceAnimation';
import { toGamePageViewModel } from './viewModel';

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
