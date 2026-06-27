import { ApiError } from '../../api/http.js';

const getErrorMessage = (
  error: unknown,
  fallbackMessage = 'Something went wrong. Please try again.',
) => {
  if (error instanceof ApiError) {
    if (error.error.error.code === 'PRICE_SNAPSHOT_EXPIRED') {
      return 'Outdated price. Fetching latest price; make a new bet on the latest price.';
    }

    if (error.error.error.code === 'PRICE_PROVIDER_UNAVAILABLE') {
      return 'Something went wrong. Please try again.';
    }
  }

  return fallbackMessage;
};

export { getErrorMessage };
