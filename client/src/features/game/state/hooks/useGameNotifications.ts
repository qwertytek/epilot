import { useMemo } from 'react';
import type { GameStateResponse, Feedback } from '@epilot/api-contract';
import type { GameFeedbackProps } from '#src/features/game/types';
import { useGameWarnings } from '#src/hooks/useGameWarnings';
import { formatDateTime } from '#src/shared/utils/formatters';

const getFeedbackMessage = (feedback: Feedback): GameFeedbackProps | null => {
  switch (feedback.type) {
    case 'GUESS_CREATED':
      return null;
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
    case 'RESOLUTION_PENDING':
      return {
        message:
          'Waiting for a fresh BTC price before resolving the open guess.',
      };
    case 'RESOLVED':
      return {
        message:
          feedback.outcome === 'CORRECT'
            ? `You won your last bet. Score +${feedback.scoreDelta}.`
            : `You lost your last bet. Score ${feedback.scoreDelta}.`,
        tone: feedback.outcome === 'CORRECT' ? 'success' : 'error',
      };
    case 'NONE':
      return null;
  }
};

type ErrorSource = {
  error: unknown;
};

export const useGameNotifications = ({
  createGuessMutation,
  gameState,
  gameStateQuery,
  priceStateQuery,
}: {
  createGuessMutation: ErrorSource;
  gameState: GameStateResponse | null;
  gameStateQuery: ErrorSource;
  priceStateQuery: ErrorSource;
}) => {
  const feedback = useMemo(
    () => (gameState ? getFeedbackMessage(gameState.feedback) : null),
    [gameState],
  );
  const error =
    gameStateQuery.error ?? priceStateQuery.error ?? createGuessMutation.error;
  const { dismissPersistentWarnings, warnings } = useGameWarnings({
    error,
    feedback,
  });

  return {
    dismissPersistentWarnings,
    error,
    warnings,
  };
};
