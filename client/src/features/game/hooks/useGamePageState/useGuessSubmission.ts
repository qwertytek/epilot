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
} from '../../game.queries.js';

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
  const disabledReason =
    activeGuess !== null
      ? 'Your previous guess is still being resolved.'
      : isSubmitting
        ? 'Submitting your guess...'
        : gameState === null || isInitialPriceLoading
          ? 'Fetching the latest price before you can bet.'
          : isPriceUnavailable || !canUsePrice
            ? 'Price is temporarily unavailable. Waiting for the next refresh.'
            : null;
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
