import { useEffect, useMemo, useState } from 'react';
import type {
  Feedback,
  GameStateResponse,
  GuessDirection,
} from '@epilot/api-contract';

import { Button } from '../../shared/components/Button';
import {
  GameApiError,
  createGuess,
  getGameState,
  resolveGuess,
} from './game.api';
import { GameFeedback } from './components/GameFeedback';
import { GameHeader } from './components/GameHeader';
import { GuessControls } from './components/GuessControls';
import { PendingGuess } from './components/PendingGuess';
import { PriceDisplay } from './components/PriceDisplay';

import './game.css';

type RequestState = 'idle' | 'loading' | 'submitting' | 'resolving';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 2,
  style: 'currency',
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const formatDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateFormatter.format(date);
};

const getFeedbackMessage = (
  feedback: Feedback,
): { message: string; tone?: 'neutral' | 'success' | 'error' } | null => {
  switch (feedback.type) {
    case 'GUESS_CREATED':
      return {
        message:
          'Guess submitted. Resolve it once the eligibility time passes.',
      };
    case 'NOT_READY':
      return {
        message: `Not ready yet. Try again after ${formatDateTime(
          feedback.retryAt,
        )}.`,
      };
    case 'PRICE_UNCHANGED':
      return {
        message: 'The price was unchanged, so the guess is still open.',
      };
    case 'RESOLVED':
      return {
        message:
          feedback.outcome === 'CORRECT'
            ? `Correct prediction. Score ${feedback.scoreDelta > 0 ? '+' : ''}${
                feedback.scoreDelta
              }.`
            : `Incorrect prediction. Score ${feedback.scoreDelta}.`,
        tone: feedback.outcome === 'CORRECT' ? 'success' : 'error',
      };
    case 'NONE':
      return null;
  }

  const exhaustiveFeedback: never = feedback;
  return exhaustiveFeedback;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof GameApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to update the game. Please try again.';
};

const GamePage = () => {
  const [gameState, setGameState] = useState<GameStateResponse | null>(null);
  const [requestState, setRequestState] = useState<RequestState>('loading');
  const [pendingDirection, setPendingDirection] = useState<
    GuessDirection | undefined
  >();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let isMounted = true;

    const loadGameState = async () => {
      try {
        setRequestState('loading');
        const state = await getGameState();

        if (!isMounted) {
          return;
        }

        setGameState(state);
        setErrorMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(getErrorMessage(error));
      } finally {
        if (isMounted) {
          setRequestState('idle');
        }
      }
    };

    void loadGameState();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!gameState?.activeGuess) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [gameState?.activeGuess]);

  const feedback = useMemo(
    () => (gameState ? getFeedbackMessage(gameState.feedback) : null),
    [gameState],
  );

  const activeGuess = gameState?.activeGuess ?? null;
  const isBusy = requestState !== 'idle';
  const resolveWaitMs = activeGuess
    ? Math.max(0, Date.parse(activeGuess.eligibleAt) - now)
    : 0;
  const canResolve = activeGuess !== null && resolveWaitMs === 0 && !isBusy;
  const resolveWaitSeconds = Math.ceil(resolveWaitMs / 1_000);

  const handleGuess = async (direction: GuessDirection) => {
    if (gameState === null || activeGuess !== null || isBusy) {
      return;
    }

    try {
      setRequestState('submitting');
      setPendingDirection(direction);
      setGameState(
        await createGuess(direction, gameState.latestPrice.priceSnapshotId),
      );
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setPendingDirection(undefined);
      setRequestState('idle');
    }
  };

  const handleResolve = async () => {
    if (activeGuess === null || isBusy) {
      return;
    }

    try {
      setRequestState('resolving');
      setGameState(await resolveGuess());
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setRequestState('idle');
    }
  };

  return (
    <div className="app-shell flex items-center text-brand-navy">
      <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm sm:p-10">
          <GameHeader score={gameState?.score ?? 0} />

          <div className="mt-6 grid gap-3" aria-live="polite">
            {requestState === 'loading' && gameState === null ? (
              <GameFeedback message="Loading live game state..." />
            ) : null}
            {errorMessage ? (
              <GameFeedback message={errorMessage} tone="error" />
            ) : null}
            {feedback ? <GameFeedback {...feedback} /> : null}
          </div>

          <div className="game-content-grid mt-9 border-t border-brand-border pt-8">
            <PriceDisplay
              price={
                gameState
                  ? currencyFormatter.format(gameState.latestPrice.priceUsd)
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
                  {requestState === 'resolving'
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
