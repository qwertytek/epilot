import { usePriceStateQuery } from '../../model/game.queries.js';

export const useGamePriceState = () => {
  const priceStateQuery = usePriceStateQuery(true);
  const currentPrice = priceStateQuery.data?.price ?? null;
  const canUsePrice =
    currentPrice !== null && priceStateQuery.data?.canCreateGuess === true;
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
