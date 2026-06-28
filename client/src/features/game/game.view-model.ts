import { formatCurrencyUsd } from '../../shared/utils/formatters.js';
import type { useGameNotifications } from './hooks/useGamePageState/useGameNotifications.js';
import type { useGamePriceState } from './hooks/useGamePageState/useGamePriceState.js';
import type { useGameSession } from './hooks/useGamePageState/useGameSession.js';
import type { useGuessSubmission } from './hooks/useGamePageState/useGuessSubmission.js';
import type { usePriceAnimation } from './hooks/usePriceAnimation.js';
import type { useResolveCountdown } from '../../hooks/useResolveCountdown.js';
import { pricePollIntervalMs } from '../../shared/utils/game.price.js';

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
    lastBet: session.gameState?.lastBet
      ? formatCurrencyUsd(session.gameState.lastBet.priceUsd)
      : null,
    observedAt: price.currentPrice ? price.currentPrice.observedAt : null,
    pollIntervalMs: pricePollIntervalMs,
    price: price.currentPrice
      ? formatCurrencyUsd(price.currentPrice.priceUsd)
      : null,
  },
  score: session.gameState?.score ?? null,
  warnings: notifications.warnings,
});
