import { ApiError } from '#src/api/http';

type DevWarningFeedbackOptions = {
  error: unknown;
  hasGameState: boolean;
  hasLatestPrice: boolean;
  isPriceUnavailable: boolean;
  isCheckingResults: boolean;
  isGameStateFetching: boolean;
  isPriceFetching: boolean;
};

const isExpiredPriceSnapshotError = (error: unknown) =>
  error instanceof ApiError &&
  error.error.error.code === 'PRICE_SNAPSHOT_EXPIRED';

const isPriceProviderUnavailableError = (error: unknown) =>
  error instanceof ApiError &&
  error.error.error.code === 'PRICE_PROVIDER_UNAVAILABLE';

const getUnexpectedErrorFeedback = (error: unknown) => {
  if (!error || error instanceof ApiError) {
    return null;
  }

  if (error instanceof Error) {
    return `Unexpected client error; showing a generic error to the user. ${error.message}`;
  }

  return 'Unexpected client error; showing a generic error to the user.';
};

const getBehindTheScenesFeedback = ({
  error,
  hasGameState,
  hasLatestPrice,
  isPriceUnavailable,
  isCheckingResults,
  isGameStateFetching,
  isPriceFetching,
}: DevWarningFeedbackOptions) =>
  [
    isExpiredPriceSnapshotError(error)
      ? 'Expired snapshot; fetching new price so user can make new bet.'
      : null,
    isPriceProviderUnavailableError(error)
      ? 'Price provider unavailable; showing a generic error to the user.'
      : null,
    getUnexpectedErrorFeedback(error),
    hasGameState && isGameStateFetching
      ? 'Refreshing game state in the background...'
      : null,
    hasLatestPrice && isPriceFetching
      ? 'Refreshing live price in the background...'
      : null,
    isCheckingResults ? 'Checking for results...' : null,
    isPriceUnavailable && isPriceFetching
      ? 'Fetching a price before guesses can be placed.'
      : null,
    isPriceUnavailable && !isPriceFetching
      ? 'Price unavailable; waiting for the next scheduled refresh.'
      : null,
  ].filter((message): message is string => message !== null);

export { getBehindTheScenesFeedback };
export type { DevWarningFeedbackOptions };
