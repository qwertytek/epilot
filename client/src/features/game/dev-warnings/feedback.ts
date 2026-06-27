import { ApiError } from '../../../api/http.js';

type DevWarningFeedbackOptions = {
  error: unknown;
  hasGameState: boolean;
  hasLatestPrice: boolean;
  isCheckingResults: boolean;
  isGameStateFetching: boolean;
  isPriceFetching: boolean;
  isPriceStale: boolean;
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
  isCheckingResults,
  isGameStateFetching,
  isPriceFetching,
  isPriceStale,
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
    hasLatestPrice && isPriceStale && !isPriceFetching
      ? 'Showing cached price while the latest price refreshes.'
      : null,
  ].filter((message): message is string => message !== null);

export { getBehindTheScenesFeedback };
export type { DevWarningFeedbackOptions };
