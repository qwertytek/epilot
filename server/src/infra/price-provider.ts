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
  onPriceProviderError: (error: unknown) => void = (error) => {
    console.warn('Price provider request failed.', error);
  },
): PriceProvider => {
  let cachedPrice:
    | {
        priceUsd: number;
        fetchedAtMs: number;
      }
    | undefined;
  let refreshPromise: Promise<number> | undefined;
  let lastReturnedFetchedAtMs: number | undefined;

  const refreshPrice = async () => {
    if (refreshPromise !== undefined) {
      return refreshPromise;
    }

    refreshPromise = priceProvider()
      .then((priceUsd) => {
        cachedPrice = { priceUsd, fetchedAtMs: now().getTime() };
        return priceUsd;
      })
      .finally(() => {
        refreshPromise = undefined;
      });

    return refreshPromise;
  };

  const getCachedPrice: PriceProvider = async () => {
    const nowMs = now().getTime();

    if (
      cachedPrice !== undefined &&
      nowMs - cachedPrice.fetchedAtMs < cacheTtlMs
    ) {
      lastReturnedFetchedAtMs = cachedPrice.fetchedAtMs;
      return cachedPrice.priceUsd;
    }

    try {
      const priceUsd = await refreshPrice();
      lastReturnedFetchedAtMs = cachedPrice?.fetchedAtMs;
      return priceUsd;
    } catch (error) {
      if (cachedPrice !== undefined) {
        lastReturnedFetchedAtMs = cachedPrice.fetchedAtMs;
        return cachedPrice.priceUsd;
      }

      if (error instanceof ApiError) {
        throw error;
      }

      onPriceProviderError(error);
      throw new ApiError(503, 'PRICE_PROVIDER_UNAVAILABLE');
    }
  };

  getCachedPrice.getLastFetchedAtMs = () => lastReturnedFetchedAtMs;
  getCachedPrice.getCachedPrice = () => cachedPrice;

  return getCachedPrice;
};
