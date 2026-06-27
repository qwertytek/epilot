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
const initialPriceExpiryRefreshLimit = 5;
const refreshedPriceExpiryRefreshLimit = 3;
const reducedPriceExpiryRefreshLimitStorageKey =
  'btc-game.reduced-price-expiry-refresh-limit';

const getInitialPriceExpiryRefreshLimit = () => {
  try {
    return window.sessionStorage.getItem(
      reducedPriceExpiryRefreshLimitStorageKey,
    ) === 'true'
      ? refreshedPriceExpiryRefreshLimit
      : initialPriceExpiryRefreshLimit;
  } catch {
    return initialPriceExpiryRefreshLimit;
  }
};

const storeReducedPriceExpiryRefreshLimit = () => {
  try {
    window.sessionStorage.setItem(
      reducedPriceExpiryRefreshLimitStorageKey,
      'true',
    );
  } catch {
    // Storage can be unavailable in private contexts; the in-memory limit still applies.
  }
};

const getPriceExpiresInMs = (price: PriceSnapshot | null) => {
  if (price === null) {
    return Number.POSITIVE_INFINITY;
  }

  return Date.parse(price.expiresAt) - Date.now();
};

const isPriceExpired = (price: PriceSnapshot | null, bufferMs = 0): boolean =>
  getPriceExpiresInMs(price) <= bufferMs;

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
  const lastActiveGuessRef = useRef(activeGuess);
  const lastAutoRefreshedPriceIdRef = useRef<string | null>(null);
  const resolvedPrice = gameStateQuery.data?.latestPrice ?? null;
  const priceStateQuery = usePriceStateQuery(
    gameStateQuery.data?.activeGuess === null && resolvedPrice === null,
  );
  const createGuessMutation = useCreateGuessMutation(userId);
  const [remainingPriceExpiryRefreshes, setRemainingPriceExpiryRefreshes] =
    useState(getInitialPriceExpiryRefreshLimit);

  const gameState = gameStateQuery.data ?? null;
  const latestPrice = priceStateQuery.data?.latestPrice ?? null;
  const currentPrice =
    resolvedPrice && (!isPriceExpired(resolvedPrice) || latestPrice === null)
      ? resolvedPrice
      : latestPrice;
  const isCurrentPriceExpired = useIsPriceExpired(currentPrice);
  const isCurrentPriceSubmittable =
    currentPrice !== null &&
    !isPriceExpired(currentPrice, priceSubmitExpiryBufferMs);
  const displayedPrice = activeGuess
    ? {
        priceUsd: activeGuess.startPriceUsd,
        observedAt: activeGuess.createdAt,
      }
    : currentPrice;
  const isGameStateKnown = gameStateQuery.data !== undefined;
  const isPriceStale =
    activeGuess === null && currentPrice !== null && isCurrentPriceExpired;

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
  const resolvedPriceAnimationTone =
    gameState?.feedback.type === 'RESOLVED'
      ? gameState.feedback.outcome === 'CORRECT'
        ? 'success'
        : 'error'
      : undefined;
  const resolvedPreviousPrice =
    resolvedAnimationKey !== undefined && lastActiveGuessRef.current
      ? formatCurrencyUsd(lastActiveGuessRef.current.startPriceUsd)
      : undefined;

  useEffect(() => {
    if (activeGuess) {
      lastActiveGuessRef.current = activeGuess;
    }
  }, [activeGuess]);

  useEffect(() => {
    if (
      !isPriceStale ||
      currentPrice === null ||
      activeGuess !== null ||
      priceStateQuery.isFetching ||
      remainingPriceExpiryRefreshes <= 0 ||
      lastAutoRefreshedPriceIdRef.current === currentPrice.priceSnapshotId
    ) {
      return;
    }

    lastAutoRefreshedPriceIdRef.current = currentPrice.priceSnapshotId;
    setRemainingPriceExpiryRefreshes((remainingRefreshes) => {
      const nextRemainingRefreshes = Math.max(remainingRefreshes - 1, 0);

      if (nextRemainingRefreshes === 0) {
        storeReducedPriceExpiryRefreshLimit();
      }

      return nextRemainingRefreshes;
    });
    void priceStateQuery.refetch();
  }, [
    activeGuess,
    currentPrice,
    isPriceStale,
    priceStateQuery,
    remainingPriceExpiryRefreshes,
  ]);

  const handleGuess = async (direction: GuessDirection) => {
    if (
      gameState === null ||
      currentPrice === null ||
      activeGuess !== null ||
      !isCurrentPriceSubmittable ||
      isPriceStale ||
      isBusy
    ) {
      return;
    }

    dismissPersistentWarnings();
    createGuessMutation.mutate({
      direction,
      priceSnapshotId: currentPrice.priceSnapshotId,
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
              animationKey={resolvedAnimationKey}
              animationPreviousPrice={resolvedPreviousPrice}
              animationTone={resolvedPriceAnimationTone}
              isRefreshing={activeGuess === null && priceStateQuery.isFetching}
              isStale={isPriceStale}
              onRefresh={() => {
                lastAutoRefreshedPriceIdRef.current =
                  currentPrice?.priceSnapshotId ?? null;
                setRemainingPriceExpiryRefreshes(
                  refreshedPriceExpiryRefreshLimit,
                );
                storeReducedPriceExpiryRefreshLimit();
                void priceStateQuery.refetch();
              }}
              lastBet={
                gameState?.lastBet
                  ? formatCurrencyUsd(gameState.lastBet.priceUsd)
                  : null
              }
              price={
                displayedPrice
                  ? formatCurrencyUsd(displayedPrice.priceUsd)
                  : null
              }
              updatedAt={
                displayedPrice
                  ? formatDateTime(displayedPrice.observedAt)
                  : null
              }
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
                  currentPrice === null ||
                  !isCurrentPriceSubmittable ||
                  isPriceStale ||
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
