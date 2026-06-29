import { formatCurrencyUsd } from '#src/shared/utils/formatters';
import type { useResolveCountdown } from '#src/hooks/useResolveCountdown';
import { pricePollIntervalMs } from '#src/shared/constants/pricePoll';
import type { useGameNotifications } from '#src/features/game/state/hooks/useGameNotifications';
import type { useGamePriceState } from '#src/features/game/state/hooks/useGamePriceState';
import type { useGameSession } from '#src/features/game/state/hooks/useGameSession';
import type { useGuessSubmission } from '#src/features/game/state/hooks/useGuessSubmission';
import type { usePriceAnimation } from '#src/features/game/state/hooks/usePriceAnimation';

export const toGamePageViewModel = ({
  guess,
  notifications,
  price,
  priceAnimation,
  resolveWaitSeconds,
  session,
}: {
  guess: ReturnType<typeof useGuessSubmission>;
  notifications: ReturnType<typeof useGameNotifications>;
  price: ReturnType<typeof useGamePriceState>;
  priceAnimation: ReturnType<typeof usePriceAnimation>;
  resolveWaitSeconds: ReturnType<
    typeof useResolveCountdown
  >['resolveWaitSeconds'];
  session: ReturnType<typeof useGameSession>;
}) => ({
  devWarningProps: {
    error: notifications.error,
    hasGameState: session.gameState !== null,
    hasLatestPrice: price.currentPrice !== null,
    isPriceUnavailable: price.isPriceUnavailable,
    isCheckingResults: session.activeGuess !== null && resolveWaitSeconds === 0,
    isGameStateFetching: session.gameStateQuery.isFetching,
    isPriceFetching: price.priceStateQuery.isFetching,
  },
  guessPanelProps: {
    activeGuess: session.activeGuess,
    disabled: !guess.canGuess,
    disabledReason: guess.disabledReason,
    isGameStateKnown: session.isGameStateKnown,
    onGuess: guess.submitGuess,
    pendingDirection: guess.pendingDirection,
    resolveWaitSeconds,
  },
  priceDisplayProps: {
    animationBlink: priceAnimation?.blink,
    animationKey: priceAnimation?.key,
    animationPreviousPrice: priceAnimation?.previousPrice,
    animationTone: priceAnimation?.tone,
    isRefreshing: price.priceStateQuery.isFetching,
    isStale: session.activeGuess === null && price.isPriceUnavailable,
    lastBet: session.gameState?.lastBet
      ? formatCurrencyUsd(session.gameState.lastBet.priceUsd)
      : null,
    onRefresh: () => {
      void price.priceStateQuery.refetch();
    },
    observedAt: price.currentPrice ? price.currentPrice.observedAt : null,
    pollIntervalMs: pricePollIntervalMs,
    price: price.currentPrice
      ? formatCurrencyUsd(price.currentPrice.priceUsd)
      : null,
  },
  score: session.gameState?.score ?? null,
  warnings: notifications.warnings,
});
