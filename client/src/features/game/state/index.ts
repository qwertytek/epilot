import { useResolveCountdown } from '#src/hooks/useResolveCountdown';
import { useGameNotifications } from '#src/features/game/state/hooks/useGameNotifications';
import { useGamePriceState } from '#src/features/game/state/hooks/useGamePriceState';
import { useGameSession } from '#src/features/game/state/hooks/useGameSession';
import { useGuessSubmission } from '#src/features/game/state/hooks/useGuessSubmission';
import { usePriceAnimation } from '#src/features/game/state/hooks/usePriceAnimation';
import { toGamePageViewModel } from '#src/features/game/state/viewModel';
import type { ActiveGuess } from '@epilot/api-contract';

const finalPricePollingPauseSeconds = 20;

export const shouldPollLivePrice = ({
  activeGuess,
  resolveWaitSeconds,
}: {
  activeGuess: ActiveGuess | null;
  resolveWaitSeconds: number;
}) =>
  activeGuess === null || resolveWaitSeconds > finalPricePollingPauseSeconds;

export const useGamePageState = () => {
  const session = useGameSession();
  const { resolveWaitSeconds } = useResolveCountdown(session.activeGuess);
  const price = useGamePriceState({
    shouldPollPrice: shouldPollLivePrice({
      activeGuess: session.activeGuess,
      resolveWaitSeconds,
    }),
  });
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
