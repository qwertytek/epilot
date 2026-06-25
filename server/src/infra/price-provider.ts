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
): PriceProvider => {
  let cachedPrice:
    | {
        priceUsd: number;
        fetchedAtMs: number;
      }
    | undefined;

  return async () => {
    const nowMs = now().getTime();

    if (
      cachedPrice !== undefined &&
      nowMs - cachedPrice.fetchedAtMs < cacheTtlMs
    ) {
      return cachedPrice.priceUsd;
    }

    try {
      const priceUsd = await priceProvider();
      cachedPrice = { priceUsd, fetchedAtMs: nowMs };
      return priceUsd;
    } catch {
      throw new ApiError(503, 'PRICE_PROVIDER_UNAVAILABLE');
    }
  };
};
