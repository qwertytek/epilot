import { useMemo, useState } from 'react';
import type { GuessDirection } from '@epilot/api-contract';

import { useResolveCountdown } from '../../hooks/useResolveCountdown';
import {
  formatCurrencyUsd,
  formatDateTime,
} from '../../shared/utils/formatters';
import { isDevelopmentApp } from '../../app/environment';
import { getErrorMessage } from '../../shared/utils/errors';
import { getAnonymousUserId } from '../../api/identity';
import { BehindTheScenesCard } from './components/BehindTheScenesCard';
import { GameFeedback } from './components/GameFeedback';
import { GameHeader } from './components/GameHeader';
import { GuessControls } from './components/GuessControls';
import { PendingGuess } from './components/PendingGuess';
import { PriceDisplay } from './components/PriceDisplay';
import {
  useCreateGuessMutation,
  useGameStateQuery,
  usePriceStateQuery,
} from './game.queries';
import { getFeedbackMessage } from './game.feedback';

import './game.css';

const GamePage = () => {
  const [showBehindTheScenes, setShowBehindTheScenes] = useState(false);
  const userId = getAnonymousUserId();
  const gameStateQuery = useGameStateQuery(userId);
  const priceStateQuery = usePriceStateQuery();
  const createGuessMutation = useCreateGuessMutation(userId);

  const gameState = gameStateQuery.data ?? null;
  const latestPrice = priceStateQuery.data?.latestPrice ?? null;

  const feedback = useMemo(
    () => (gameState ? getFeedbackMessage(gameState.feedback) : null),
    [gameState],
  );

  const activeGuess = gameState?.activeGuess ?? null;
  const isSubmitting = createGuessMutation.isPending;
  const isBusy =
    gameStateQuery.isLoading || priceStateQuery.isLoading || isSubmitting;
  const { resolveWaitSeconds } = useResolveCountdown(activeGuess);
  const isCheckingResults = activeGuess !== null && resolveWaitSeconds === 0;
  const error =
    gameStateQuery.error ?? priceStateQuery.error ?? createGuessMutation.error;
  const pendingDirection = isSubmitting
    ? createGuessMutation.variables?.direction
    : undefined;
  const behindTheScenesFeedback = [
    gameState && gameStateQuery.isFetching
      ? 'Refreshing game state in the background...'
      : null,
    latestPrice && priceStateQuery.isFetching
      ? 'Refreshing live price in the background...'
      : null,
    isCheckingResults ? 'Checking for results...' : null,
    latestPrice && priceStateQuery.isStale && !priceStateQuery.isFetching
      ? 'Showing cached price while the latest price refreshes.'
      : null,
  ].filter((message): message is string => message !== null);

  const handleGuess = async (direction: GuessDirection) => {
    if (
      gameState === null ||
      latestPrice === null ||
      activeGuess !== null ||
      isBusy
    ) {
      return;
    }

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

          <div className="mt-6 grid gap-3" aria-live="polite">
            {error ? (
              <GameFeedback
                message={getErrorMessage(
                  error,
                  'Unable to update the game. Please try again.',
                )}
                tone="error"
              />
            ) : null}
            {feedback ? <GameFeedback {...feedback} /> : null}
          </div>

          <div className="game-content-grid mt-9 border-t border-brand-border pt-8">
            <PriceDisplay
              price={
                latestPrice ? formatCurrencyUsd(latestPrice.priceUsd) : null
              }
              updatedAt={
                latestPrice ? formatDateTime(latestPrice.observedAt) : null
              }
            />

            {activeGuess ? (
              <div className="grid gap-4">
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
                disabled={gameState === null || latestPrice === null || isBusy}
                label="Which way will it move?"
                onGuess={handleGuess}
                pendingDirection={pendingDirection}
              />
            )}
          </div>

          {isDevelopmentApp ? (
            <div className="mt-8 border-t border-brand-border pt-5">
              <label className="behind-scenes-toggle">
                <span className="grid gap-1">
                  <span className="text-sm font-semibold text-brand-navy">
                    Behind the scenes
                  </span>
                  <span className="behind-scenes-warning">
                    <span
                      className="behind-scenes-warning-icon"
                      aria-hidden="true"
                    >
                      !
                    </span>
                    <span>Disabled in production using env production.</span>
                  </span>
                </span>
                <input
                  checked={showBehindTheScenes}
                  className="sr-only"
                  onChange={(event) =>
                    setShowBehindTheScenes(event.target.checked)
                  }
                  type="checkbox"
                />
                <span className="behind-scenes-switch" aria-hidden="true" />
              </label>
            </div>
          ) : null}
        </div>

        {isDevelopmentApp && showBehindTheScenes ? (
          <BehindTheScenesCard feedbackMessages={behindTheScenesFeedback} />
        ) : null}
      </main>
    </div>
  );
};

export { GamePage };
