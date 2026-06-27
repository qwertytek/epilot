import { useMemo } from 'react';
import type { GuessDirection } from '@epilot/api-contract';

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

const GamePage = () => {
  const userId = getAnonymousUserId();
  const gameStateQuery = useGameStateQuery(userId);
  const activeGuess = gameStateQuery.data?.activeGuess ?? null;
  const priceStateQuery = usePriceStateQuery(
    gameStateQuery.data?.activeGuess === null,
  );
  const createGuessMutation = useCreateGuessMutation(userId);

  const gameState = gameStateQuery.data ?? null;
  const latestPrice = priceStateQuery.data?.latestPrice ?? null;
  const displayedPrice = activeGuess
    ? {
        priceUsd: activeGuess.startPriceUsd,
        observedAt: activeGuess.createdAt,
      }
    : latestPrice;
  const isGameStateKnown = gameStateQuery.data !== undefined;
  const isPriceStale =
    activeGuess === null && priceStateQuery.isStale && latestPrice !== null;

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

  const handleGuess = async (direction: GuessDirection) => {
    if (
      gameState === null ||
      latestPrice === null ||
      activeGuess !== null ||
      isPriceStale ||
      isBusy
    ) {
      return;
    }

    dismissPersistentWarnings();
    createGuessMutation.mutate({
      direction,
      priceSnapshotId: latestPrice.priceSnapshotId,
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
              isRefreshing={activeGuess === null && priceStateQuery.isFetching}
              isStale={isPriceStale}
              onRefresh={() => {
                void priceStateQuery.refetch();
              }}
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
                  latestPrice === null ||
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
            hasLatestPrice={latestPrice !== null}
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
