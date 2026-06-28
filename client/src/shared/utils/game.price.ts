import type { PriceSnapshot } from '@epilot/api-contract';

export const pricePollIntervalMs = 10_000;

export const getPriceAnimationTone = (
  previousPrice: PriceSnapshot,
  nextPrice: PriceSnapshot,
): 'success' | 'error' | 'neutral' => {
  if (nextPrice.priceUsd === previousPrice.priceUsd) {
    return 'neutral';
  }

  return nextPrice.priceUsd > previousPrice.priceUsd ? 'success' : 'error';
};
