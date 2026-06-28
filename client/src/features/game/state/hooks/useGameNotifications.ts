import { useMemo } from 'react';
import type { GameStateResponse } from '@epilot/api-contract';

import { useGameWarnings } from '../../../../hooks/useGameWarnings';
import { getFeedbackMessage } from '../../model/game.feedback';

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
