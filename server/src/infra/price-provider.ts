import { ApiError } from '../errors.js';
import type { PriceProvider } from '../types.js';

export const createCoinGeckoPriceProvider =
  (url: string, requestTimeoutMs: number): PriceProvider =>
  async () => {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), requestTimeoutMs);

    try {
      const response = await fetch(url, { signal: abortController.signal });

      if (!response.ok) {
        throw new Error(`CoinGecko returned ${response.status}`);
      }

      const payload = (await response.json()) as {
        bitcoin?: { usd?: unknown };
      };
      const priceUsd = payload.bitcoin?.usd;

      if (typeof priceUsd !== 'number' || !Number.isFinite(priceUsd)) {
        throw new Error('CoinGecko response did not include bitcoin.usd');
      }

      return priceUsd;
    } finally {
      clearTimeout(timeout);
    }
  };

export const createCachedPriceProvider = (
  priceProvider: PriceProvider,
  now: () => Date,
  cacheTtlMs: number,
  failureCooldownMs: number,
): PriceProvider => {
  let cachedPrice:
    | {
        priceUsd: number;
        fetchedAtMs: number;
      }
    | undefined;
  let refreshPromise: Promise<number> | undefined;
  let lastReturnedFetchedAtMs: number | undefined;
  let lastFailureMs: number | undefined;

  const refreshPrice = async () => {
    if (refreshPromise !== undefined) {
      return refreshPromise;
    }

    refreshPromise = priceProvider()
      .then((priceUsd) => {
        cachedPrice = { priceUsd, fetchedAtMs: now().getTime() };
        lastFailureMs = undefined;
        return priceUsd;
      })
      .catch((error: unknown) => {
        lastFailureMs = now().getTime();
        throw error;
      })
      .finally(() => {
        refreshPromise = undefined;
      });

    return refreshPromise;
  };

  const getCachedPrice: PriceProvider = async ({
    allowStale = true,
    maxAgeMs = cacheTtlMs,
  } = {}) => {
    const nowMs = now().getTime();
    const allowedCacheAgeMs = Math.min(cacheTtlMs, maxAgeMs);
    const retryAfterMs = getCachedPrice.getRetryAfterMs?.();

    if (
      cachedPrice !== undefined &&
      nowMs - cachedPrice.fetchedAtMs < allowedCacheAgeMs
    ) {
      lastReturnedFetchedAtMs = cachedPrice.fetchedAtMs;
      return cachedPrice.priceUsd;
    }

    if (cachedPrice !== undefined && allowStale) {
      lastReturnedFetchedAtMs = cachedPrice.fetchedAtMs;
      if (retryAfterMs === undefined) {
        void refreshPrice().catch((error: unknown) => {
          console.warn('Background price refresh failed.', error);
        });
      }
      return cachedPrice.priceUsd;
    }

    try {
      if (retryAfterMs !== undefined) {
        throw new ApiError(503, 'PRICE_PROVIDER_UNAVAILABLE');
      }

      const priceUsd = await refreshPrice();
      lastReturnedFetchedAtMs = cachedPrice?.fetchedAtMs;
      return priceUsd;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      console.warn('Price provider request failed.', error);
      throw new ApiError(503, 'PRICE_PROVIDER_UNAVAILABLE');
    }
  };

  getCachedPrice.getLastFetchedAtMs = () => lastReturnedFetchedAtMs;
  getCachedPrice.getCachedPrice = () => cachedPrice;
  getCachedPrice.getRetryAfterMs = () => {
    if (lastFailureMs === undefined) {
      return undefined;
    }

    const retryAfterMs = lastFailureMs + failureCooldownMs - now().getTime();

    return retryAfterMs > 0 ? retryAfterMs : undefined;
  };

  return getCachedPrice;
};
