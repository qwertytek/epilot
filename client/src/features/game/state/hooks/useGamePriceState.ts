import { useRef } from 'react';
import type { PriceSnapshot } from '@epilot/api-contract';

import { usePriceStateQuery } from '#src/features/game/data/queries';

export const getDisplayPrice = (
  latestPrice: PriceSnapshot | null,
  lastKnownPrice: PriceSnapshot | null,
) => latestPrice ?? lastKnownPrice;

export const useGamePriceState = () => {
  const priceStateQuery = usePriceStateQuery(true);
  const latestPrice = priceStateQuery.data?.price ?? null;
  const lastKnownPriceRef = useRef<PriceSnapshot | null>(null);

  if (latestPrice !== null) {
    lastKnownPriceRef.current = latestPrice;
  }

  const currentPrice = getDisplayPrice(
    latestPrice,
    lastKnownPriceRef.current,
  );
  const canUsePrice =
    latestPrice !== null && priceStateQuery.data?.canCreateGuess === true;
  const isInitialPriceLoading =
    priceStateQuery.isFetching && currentPrice === null;
  const isPriceUnavailable = priceStateQuery.data !== undefined && !canUsePrice;

  return {
    canUsePrice,
    currentPrice,
    isInitialPriceLoading,
    isPriceUnavailable,
    priceStateQuery,
  };
};
