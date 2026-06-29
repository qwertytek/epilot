import type {
  ActiveGuess,
  GameStateResponse,
  GuessDirection,
  PriceSnapshot,
} from '@epilot/api-contract';
import type {
  useCreateGuessMutation,
  useGameStateQuery,
  usePriceStateQuery,
} from '#src/features/game/data/queries';

export const getGuessDisabledReason = ({
  hasActiveGuess,
  isInitialPriceLoading,
  isPriceUnavailable,
  isSubmitting,
  canUsePrice,
  hasGameState,
}: {
  hasActiveGuess: boolean;
  isInitialPriceLoading: boolean;
  isPriceUnavailable: boolean;
  isSubmitting: boolean;
  canUsePrice: boolean;
  hasGameState: boolean;
}) =>
  hasActiveGuess
    ? 'Your previous guess is still being resolved.'
    : isSubmitting
      ? 'Submitting your guess...'
      : isPriceUnavailable
        ? null
        : !hasGameState || isInitialPriceLoading
          ? 'Fetching the latest price before you can bet.'
          : !canUsePrice
            ? 'Price is temporarily unavailable. Waiting for the next refresh.'
            : null;

export const useGuessSubmission = ({
  activeGuess,
  currentPrice,
  canUsePrice,
  createGuessMutation,
  dismissPersistentWarnings,
  gameState,
  gameStateQuery,
  isInitialPriceLoading,
  isPriceUnavailable,
  priceStateQuery,
}: {
  activeGuess: ActiveGuess | null;
  currentPrice: PriceSnapshot | null;
  canUsePrice: boolean;
  createGuessMutation: ReturnType<typeof useCreateGuessMutation>;
  dismissPersistentWarnings: () => void;
  gameState: GameStateResponse | null;
  gameStateQuery: ReturnType<typeof useGameStateQuery>;
  isInitialPriceLoading: boolean;
  isPriceUnavailable: boolean;
  priceStateQuery: ReturnType<typeof usePriceStateQuery>;
}) => {
  const isSubmitting = createGuessMutation.isPending;
  const isBusy =
    gameStateQuery.isLoading || priceStateQuery.isLoading || isSubmitting;
  const disabledReason = getGuessDisabledReason({
    canUsePrice,
    hasActiveGuess: activeGuess !== null,
    hasGameState: gameState !== null,
    isInitialPriceLoading,
    isPriceUnavailable,
    isSubmitting,
  });
  const canGuess =
    gameState !== null &&
    currentPrice !== null &&
    activeGuess === null &&
    canUsePrice &&
    !isSubmitting;
  const pendingDirection = isSubmitting
    ? createGuessMutation.variables?.direction
    : undefined;

  const submitGuess = (direction: GuessDirection) => {
    if (!canGuess || currentPrice === null) {
      return;
    }

    dismissPersistentWarnings();
    createGuessMutation.mutate({
      direction,
      priceSnapshotId: currentPrice.priceSnapshotId,
    });
  };

  return {
    canGuess,
    disabledReason,
    isBusy,
    isSubmitting,
    pendingDirection,
    submitGuess,
  };
};
