import { useMemo } from 'react';
import type { GuessDirection } from '@epilot/api-contract';

import { Button } from '../../shared/components/Button';
import { useResolveCountdown } from '../../hooks/useResolveCountdown';
import {
  formatCurrencyUsd,
  formatDateTime,
} from '../../shared/utils/formatters';
import { getErrorMessage } from '../../shared/utils/errors';
import { getAnonymousUserId } from './game.api';
import { GameFeedback } from './components/GameFeedback';
import { GameHeader } from './components/GameHeader';
import { GuessControls } from './components/GuessControls';
import { PendingGuess } from './components/PendingGuess';
import { PriceDisplay } from './components/PriceDisplay';
import {
  useCreateGuessMutation,
  useGameStateQuery,
  useResolveGuessMutation,
} from './game.queries';
import { getFeedbackMessage } from './game.feedback';

import './game.css';

const GamePage = () => {
  const userId = getAnonymousUserId();
  const gameStateQuery = useGameStateQuery(userId);
  const createGuessMutation = useCreateGuessMutation(userId);
  const resolveGuessMutation = useResolveGuessMutation(userId);

  const gameState = gameStateQuery.data ?? null;

  const feedback = useMemo(
    () => (gameState ? getFeedbackMessage(gameState.feedback) : null),
    [gameState],
  );

  const activeGuess = gameState?.activeGuess ?? null;
  const isSubmitting = createGuessMutation.isPending;
  const isResolving = resolveGuessMutation.isPending;
  const isBusy = gameStateQuery.isLoading || isSubmitting || isResolving;
  const { canResolve, resolveWaitSeconds } = useResolveCountdown(
    activeGuess,
    isBusy,
  );
  const error =
    gameStateQuery.error ??
    createGuessMutation.error ??
    resolveGuessMutation.error;
  const pendingDirection = createGuessMutation.variables?.direction;
  const hasNoGameState =
    !gameStateQuery.isLoading && !gameStateQuery.isError && gameState === null;

  const handleGuess = async (direction: GuessDirection) => {
    if (gameState === null || activeGuess !== null || isBusy) {
      return;
    }

    createGuessMutation.mutate({
      direction,
      priceSnapshotId: gameState.latestPrice.priceSnapshotId,
    });
  };

  const handleResolve = async () => {
    if (activeGuess === null || isBusy) {
      return;
    }

    resolveGuessMutation.mutate();
  };

  return (
    <div className="app-shell flex items-center text-brand-navy">
      <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm sm:p-10">
          <GameHeader score={gameState?.score ?? 0} />

          <div className="mt-6 grid gap-3" aria-live="polite">
            {gameStateQuery.isLoading ? (
              <GameFeedback message="Loading live game state..." />
            ) : null}
            {hasNoGameState ? (
              <GameFeedback message="No game state is available yet." />
            ) : null}
            {error ? (
              <GameFeedback
                message={getErrorMessage(
                  error,
                  'Unable to update the game. Please try again.',
                )}
                tone="error"
              />
            ) : null}
            {gameState && gameStateQuery.isFetching ? (
              <GameFeedback message="Refreshing live price in the background..." />
            ) : null}
            {gameState &&
            gameStateQuery.isStale &&
            !gameStateQuery.isFetching ? (
              <GameFeedback message="Showing cached game state while the latest price is stale." />
            ) : null}
            {feedback ? <GameFeedback {...feedback} /> : null}
          </div>

          <div className="game-content-grid mt-9 border-t border-brand-border pt-8">
            <PriceDisplay
              price={
                gameState
                  ? formatCurrencyUsd(gameState.latestPrice.priceUsd)
                  : '...'
              }
              updatedAt={
                gameState
                  ? formatDateTime(gameState.latestPrice.observedAt)
                  : ''
              }
            />

            {activeGuess ? (
              <div className="grid gap-4">
                <PendingGuess
                  direction={activeGuess.direction}
                  eligibleAt={formatDateTime(activeGuess.eligibleAt)}
                />
                <Button disabled={!canResolve} onClick={handleResolve}>
                  {isResolving
                    ? 'Resolving...'
                    : resolveWaitSeconds > 0
                      ? `Resolve in ${resolveWaitSeconds}s`
                      : 'Resolve guess'}
                </Button>
              </div>
            ) : (
              <GuessControls
                disabled={gameState === null || isBusy}
                label="Which way will it move?"
                onGuess={handleGuess}
                pendingDirection={pendingDirection}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export { GamePage };
