import { useEffect, useMemo, useRef, useState } from 'react';
import type { GuessDirection, PriceSnapshot } from '@epilot/api-contract';

import { useResolveCountdown } from '../../hooks/useResolveCountdown';
import { useGameWarnings } from '../../hooks/useGameWarnings';
import {
  formatCurrencyUsd,
  formatDateTime,
} from '../../shared/utils/formatters';
import { getAnonymousUserId } from '../../api/identity';
import { GameHeader } from './components/GameHeader';
import { GameWarnings } from './components/GameWarnings';
import { GuessControls } from './components/GuessControls';
import { GuessStateSkeleton } from './components/GuessStateSkeleton';
import { PendingGuess } from './components/PendingGuess';
import { PriceDisplay } from './components/PriceDisplay';
import { DevWarnings } from './dev-warnings/DevWarnings';
import {
  useCreateGuessMutation,
  useGameStateQuery,
  usePriceStateQuery,
} from './game.queries';
import { getFeedbackMessage } from './game.feedback';

import './game.css';

const priceSubmitExpiryBufferMs = 1_000;
const priceExpiryRefreshAllowanceMs = 60_000;
const stalePriceRefreshRetryBackoffMs = [1_000, 2_000, 5_000, 10_000] as const;

const getPriceExpiryRefreshesAllowedUntilMs = () =>
  Date.now() + priceExpiryRefreshAllowanceMs;

const getPriceExpiresInMs = (price: PriceSnapshot | null) => {
  if (price === null) {
    return Number.POSITIVE_INFINITY;
  }

  return Date.parse(price.expiresAt) - Date.now();
};

const isPriceExpired = (price: PriceSnapshot | null, bufferMs = 0): boolean =>
  getPriceExpiresInMs(price) <= bufferMs;

const getPriceAnimationTone = (
  previousPrice: PriceSnapshot,
  nextPrice: PriceSnapshot,
): 'success' | 'error' | 'neutral' => {
  if (nextPrice.priceUsd === previousPrice.priceUsd) {
    return 'neutral';
  }

  return nextPrice.priceUsd > previousPrice.priceUsd ? 'success' : 'error';
};

const useIsPriceExpired = (price: PriceSnapshot | null) => {
  const [now, setNow] = useState(() => Date.now());
  const expiresAtMs = price ? Date.parse(price.expiresAt) : null;

  useEffect(() => {
    if (expiresAtMs === null) {
      return;
    }

    const delayMs = Math.max(expiresAtMs - Date.now(), 0);
    const timeoutId = window.setTimeout(() => {
      setNow(Date.now());
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [expiresAtMs]);

  if (expiresAtMs === null) {
    return false;
  }

  return expiresAtMs <= now;
};

const GamePage = () => {
  const userId = getAnonymousUserId();
  const gameStateQuery = useGameStateQuery(userId);
  const activeGuess = gameStateQuery.data?.activeGuess ?? null;
  const activeGuessId = activeGuess?.id ?? null;
  const lastActiveGuessRef = useRef(activeGuess);
  const resolvedPrice = gameStateQuery.data?.latestPrice ?? null;
  const priceStateQuery = usePriceStateQuery(resolvedPrice === null);
  const createGuessMutation = useCreateGuessMutation(userId);
  const [
    priceExpiryRefreshesAllowedUntilMs,
    setPriceExpiryRefreshesAllowedUntilMs,
  ] = useState<number | null>(null);
  const [priceRefreshRetryAttempt, setPriceRefreshRetryAttempt] = useState(0);

  const gameState = gameStateQuery.data ?? null;
  const latestPrice = priceStateQuery.data?.latestPrice ?? null;
  const displayPrice = priceStateQuery.data?.displayPrice ?? latestPrice;
  const bettablePrice =
    resolvedPrice && !isPriceExpired(resolvedPrice)
      ? resolvedPrice
      : latestPrice;
  const currentPrice =
    resolvedPrice && (!isPriceExpired(resolvedPrice) || displayPrice === null)
      ? resolvedPrice
      : displayPrice;
  const isCurrentPriceExpired = useIsPriceExpired(currentPrice);
  const isCurrentPriceSubmittable =
    bettablePrice !== null &&
    !isPriceExpired(bettablePrice, priceSubmitExpiryBufferMs) &&
    (priceStateQuery.data?.canCreateGuess ?? true);
  const displayedPrice = currentPrice;
  const isGameStateKnown = gameStateQuery.data !== undefined;
  const isPriceStale = currentPrice !== null && isCurrentPriceExpired;
  const isPriceUnavailable = priceStateQuery.data?.status === 'unavailable';
  const needsPriceRefresh =
    isPriceStale ||
    isPriceUnavailable ||
    priceStateQuery.data?.status === 'stale-fallback';
  const hasAutoRefreshWindowExpired =
    priceExpiryRefreshesAllowedUntilMs !== null &&
    Date.now() >= priceExpiryRefreshesAllowedUntilMs;
  const shouldShowStalePriceRefresh =
    activeGuess === null && isPriceStale && hasAutoRefreshWindowExpired;

  const feedback = useMemo(
    () => (gameState ? getFeedbackMessage(gameState.feedback) : null),
    [gameState],
  );

  const isSubmitting = createGuessMutation.isPending;
  const isBusy =
    gameStateQuery.isLoading || priceStateQuery.isLoading || isSubmitting;
  const { resolveWaitSeconds } = useResolveCountdown(activeGuess);
  const isCheckingResults = activeGuess !== null && resolveWaitSeconds === 0;
  const error =
    gameStateQuery.error ?? priceStateQuery.error ?? createGuessMutation.error;
  const { dismissPersistentWarnings, warnings } = useGameWarnings({
    error,
    feedback,
  });
  const pendingDirection = isSubmitting
    ? createGuessMutation.variables?.direction
    : undefined;
  const resolvedAnimationKey =
    gameState?.feedback.type === 'RESOLVED'
      ? resolvedPrice?.priceSnapshotId
      : undefined;
  const resolvedPriceAnimationTone: 'success' | 'error' | undefined =
    gameState?.feedback.type === 'RESOLVED'
      ? gameState.feedback.outcome === 'CORRECT'
        ? 'success'
        : 'error'
      : undefined;
  const resolvedPreviousPrice =
    resolvedAnimationKey !== undefined && lastActiveGuessRef.current
      ? formatCurrencyUsd(lastActiveGuessRef.current.startPriceUsd)
      : undefined;
  const lastLivePriceRef = useRef<PriceSnapshot | null>(null);
  const [livePriceAnimation, setLivePriceAnimation] = useState<{
    key: string;
    previousPrice: string;
    tone: 'success' | 'error' | 'neutral';
  } | null>(null);
  const priceAnimation =
    resolvedAnimationKey !== undefined
      ? {
          blink: 'repeat' as const,
          key: resolvedAnimationKey,
          previousPrice: resolvedPreviousPrice,
          tone: resolvedPriceAnimationTone,
        }
      : livePriceAnimation
        ? {
            blink: 'single' as const,
            key: livePriceAnimation.key,
            previousPrice: livePriceAnimation.previousPrice,
            tone: livePriceAnimation.tone,
          }
        : null;

  useEffect(() => {
    if (activeGuess) {
      lastActiveGuessRef.current = activeGuess;
    }
  }, [activeGuess]);

  useEffect(() => {
    if (activeGuessId) {
      setPriceExpiryRefreshesAllowedUntilMs(null);
    }
  }, [activeGuessId]);

  useEffect(() => {
    if (priceStateQuery.data?.status === 'fresh') {
      setPriceRefreshRetryAttempt(0);
    }
  }, [priceStateQuery.data?.status, latestPrice?.priceSnapshotId]);

  useEffect(() => {
    if (currentPrice === null) {
      return;
    }

    const previousPrice = lastLivePriceRef.current;
    lastLivePriceRef.current = currentPrice;

    if (
      previousPrice === null ||
      previousPrice.priceSnapshotId === currentPrice.priceSnapshotId ||
      resolvedAnimationKey !== undefined
    ) {
      return;
    }

    setLivePriceAnimation({
      key: currentPrice.priceSnapshotId,
      previousPrice: formatCurrencyUsd(previousPrice.priceUsd),
      tone: getPriceAnimationTone(previousPrice, currentPrice),
    });
  }, [currentPrice, resolvedAnimationKey]);

  useEffect(() => {
    if (!needsPriceRefresh || priceStateQuery.isFetching) {
      return;
    }

    if (activeGuess === null) {
      if (priceExpiryRefreshesAllowedUntilMs === null) {
        setPriceExpiryRefreshesAllowedUntilMs(
          getPriceExpiryRefreshesAllowedUntilMs(),
        );
        return;
      }

      if (hasAutoRefreshWindowExpired) {
        return;
      }
    }

    const retryAfterMs = priceStateQuery.data?.retryAfterMs;
    const backoffMs =
      stalePriceRefreshRetryBackoffMs[
        Math.min(
          priceRefreshRetryAttempt,
          stalePriceRefreshRetryBackoffMs.length - 1,
        )
      ];
    const timeoutId = window.setTimeout(() => {
      if (
        activeGuess === null &&
        priceExpiryRefreshesAllowedUntilMs !== null &&
        Date.now() >= priceExpiryRefreshesAllowedUntilMs
      ) {
        return;
      }

      setPriceRefreshRetryAttempt((attempt) => attempt + 1);
      void priceStateQuery.refetch();
    }, retryAfterMs ?? backoffMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeGuess,
    hasAutoRefreshWindowExpired,
    needsPriceRefresh,
    priceExpiryRefreshesAllowedUntilMs,
    priceRefreshRetryAttempt,
    priceStateQuery,
  ]);

  const handleGuess = async (direction: GuessDirection) => {
    if (
      gameState === null ||
      bettablePrice === null ||
      activeGuess !== null ||
      !isCurrentPriceSubmittable ||
      isBusy
    ) {
      return;
    }

    dismissPersistentWarnings();
    createGuessMutation.mutate({
      direction,
      priceSnapshotId: bettablePrice.priceSnapshotId,
    });
  };

  return (
    <div className="app-shell flex items-center text-brand-navy">
      <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm sm:p-10">
          <GameHeader score={gameState?.score ?? null} />

          <GameWarnings warnings={warnings} />

          <div className="game-content-grid mt-9 border-t border-brand-border pt-8">
            <PriceDisplay
              animationBlink={priceAnimation?.blink}
              animationKey={priceAnimation?.key}
              animationPreviousPrice={priceAnimation?.previousPrice}
              animationTone={priceAnimation?.tone}
              isRefreshing={priceStateQuery.isFetching}
              isStale={shouldShowStalePriceRefresh}
              onRefresh={() => {
                setPriceRefreshRetryAttempt(0);
                setPriceExpiryRefreshesAllowedUntilMs(
                  getPriceExpiryRefreshesAllowedUntilMs(),
                );
                void priceStateQuery.refetch();
              }}
              lastBet={
                gameState?.lastBet
                  ? formatCurrencyUsd(gameState.lastBet.priceUsd)
                  : null
              }
              observedAt={displayedPrice ? displayedPrice.observedAt : null}
              price={
                displayedPrice
                  ? formatCurrencyUsd(displayedPrice.priceUsd)
                  : null
              }
              refreshesAt={displayedPrice ? displayedPrice.expiresAt : null}
            />

            {!isGameStateKnown ? (
              <GuessStateSkeleton />
            ) : activeGuess ? (
              <div className="game-guess-state grid gap-4">
                <PendingGuess
                  direction={activeGuess.direction}
                  eligibleAt={formatDateTime(activeGuess.eligibleAt)}
                />
                <p className="rounded-2xl border border-brand-border bg-white px-5 py-3 text-sm font-semibold text-brand-primary">
                  {resolveWaitSeconds > 0
                    ? `Checking results in ${resolveWaitSeconds}s`
                    : 'Checking for results...'}
                </p>
              </div>
            ) : (
              <GuessControls
                disabled={
                  gameState === null ||
                  bettablePrice === null ||
                  !isCurrentPriceSubmittable ||
                  isBusy
                }
                label="Which way will it move?"
                onGuess={handleGuess}
                pendingDirection={pendingDirection}
              />
            )}
          </div>

          <DevWarnings
            error={error}
            hasGameState={gameState !== null}
            hasLatestPrice={currentPrice !== null}
            isCheckingResults={isCheckingResults}
            isGameStateFetching={gameStateQuery.isFetching}
            isPriceFetching={priceStateQuery.isFetching}
            isPriceStale={isPriceStale}
          />
        </div>
      </main>
    </div>
  );
};

export { GamePage };
