import { useEffect, useRef, useState } from 'react';
import type { ActiveGuess, PriceSnapshot } from '@epilot/api-contract';

import { formatCurrencyUsd } from '../../../shared/utils/formatters.js';
import { getPriceAnimationTone } from '../../../shared/utils/game.price.js';

type PriceAnimation =
  | {
      blink: 'repeat';
      key: string;
      previousPrice?: string;
      tone?: 'success' | 'error';
    }
  | {
      blink: 'single';
      key: string;
      previousPrice: string;
      tone: 'success' | 'error' | 'neutral';
    };

export const usePriceAnimation = ({
  activeGuess,
  currentPrice,
  resolvedOutcome,
  resolvedPrice,
}: {
  activeGuess: ActiveGuess | null;
  currentPrice: PriceSnapshot | null;
  resolvedOutcome?: 'CORRECT' | 'INCORRECT';
  resolvedPrice: PriceSnapshot | null;
}): PriceAnimation | null => {
  const lastActiveGuessRef = useRef(activeGuess);
  const lastLivePriceRef = useRef<PriceSnapshot | null>(null);
  const [livePriceAnimation, setLivePriceAnimation] = useState<{
    key: string;
    previousPrice: string;
    tone: 'success' | 'error' | 'neutral';
  } | null>(null);
  const resolvedAnimationKey =
    resolvedOutcome !== undefined ? resolvedPrice?.priceSnapshotId : undefined;
  const resolvedPriceAnimationTone =
    resolvedOutcome === undefined
      ? undefined
      : resolvedOutcome === 'CORRECT'
        ? 'success'
        : 'error';
  const resolvedPreviousPrice =
    resolvedAnimationKey !== undefined && lastActiveGuessRef.current
      ? formatCurrencyUsd(lastActiveGuessRef.current.startPriceUsd)
      : undefined;

  useEffect(() => {
    if (activeGuess) {
      lastActiveGuessRef.current = activeGuess;
    }
  }, [activeGuess]);

  useEffect(() => {
    if (currentPrice === null) {
      return;
    }

    const previousPrice = lastLivePriceRef.current;
    lastLivePriceRef.current = currentPrice;

    if (
      previousPrice === null ||
      previousPrice.priceSnapshotId === currentPrice.priceSnapshotId ||
      resolvedAnimationKey !== undefined
    ) {
      return;
    }

    setLivePriceAnimation({
      key: currentPrice.priceSnapshotId,
      previousPrice: formatCurrencyUsd(previousPrice.priceUsd),
      tone: getPriceAnimationTone(previousPrice, currentPrice),
    });
  }, [currentPrice, resolvedAnimationKey]);

  if (resolvedAnimationKey !== undefined) {
    return {
      blink: 'repeat',
      key: resolvedAnimationKey,
      previousPrice: resolvedPreviousPrice,
      tone: resolvedPriceAnimationTone,
    };
  }

  if (livePriceAnimation) {
    return {
      blink: 'single',
      key: livePriceAnimation.key,
      previousPrice: livePriceAnimation.previousPrice,
      tone: livePriceAnimation.tone,
    };
  }

  return null;
};
