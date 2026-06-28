import { type CSSProperties, useEffect, useMemo, useState } from 'react';

import type { PriceDisplayProps } from '../model/game.types';

const formatElapsedTime = (elapsedMs: number) => {
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1_000));

  if (elapsedSeconds < 2) {
    return 'just now';
  }

  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s ago`;
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  return elapsedMinutes === 1 ? '1m ago' : `${elapsedMinutes}m ago`;
};

const getPriceStatus = (
  observedAt: string | null,
  now: number,
  pollIntervalMs: number,
) => {
  const refreshLabel = `updates every ${Math.ceil(pollIntervalMs / 1_000)}s`;

  if (observedAt === null) {
    return {
      checkedLabel: 'Snapshot pending',
      progressPercent: 0,
      refreshLabel,
    };
  }

  const observedAtMs = Date.parse(observedAt);
  const checkedLabel = Number.isNaN(observedAtMs)
    ? 'Checked recently'
    : `Checked ${formatElapsedTime(now - observedAtMs)}`;

  if (Number.isNaN(observedAtMs)) {
    return {
      checkedLabel,
      progressPercent: 0,
      refreshLabel,
    };
  }

  const elapsedMs = Math.max(now - observedAtMs, 0);
  const progressPercent = Math.min(
    100,
    Math.max(0, (elapsedMs / pollIntervalMs) * 100),
  );

  return {
    checkedLabel,
    progressPercent,
    refreshLabel,
  };
};

export const PriceDisplay = ({
  animationBlink = 'repeat',
  animationKey,
  animationPreviousPrice,
  animationTone,
  isRefreshing = false,
  lastBet,
  observedAt,
  pollIntervalMs,
  price,
}: PriceDisplayProps) => {
  const [now, setNow] = useState(() => Date.now());
  const isUpdatingExistingPrice = isRefreshing && price !== null;
  const shouldAnimatePrice =
    animationKey !== undefined &&
    animationPreviousPrice !== undefined &&
    animationTone !== undefined &&
    price !== null;
  const priceStatus = useMemo(
    () => getPriceStatus(observedAt, now, pollIntervalMs),
    [now, observedAt, pollIntervalMs],
  );
  const refreshProgressStyle = {
    '--price-refresh-progress': `${priceStatus.progressPercent}%`,
  } as CSSProperties;

  useEffect(() => {
    if (observedAt === null) {
      return;
    }

    setNow(Date.now());

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [observedAt]);

  return (
    <section
      aria-busy={isRefreshing}
      aria-labelledby="latest-price-heading"
      className="game-price-panel"
    >
      <p
        className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-secondary"
        id="latest-price-heading"
      >
        Latest BTC / USD
      </p>
      <p className="game-price-value mt-4 text-4xl font-bold tracking-tight text-brand-navy sm:text-5xl">
        {shouldAnimatePrice ? (
          <span
            aria-label={price}
            className="price-transition"
            key={animationKey}
          >
            <span aria-hidden="true" className="price-value-old">
              {animationPreviousPrice}
            </span>
            <span
              aria-hidden="true"
              className={`price-value-new is-${animationTone} blink-${animationBlink}`}
            >
              {price}
            </span>
          </span>
        ) : (
          (price ?? (
            <span
              className="price-loading-dots"
              aria-label="Loading Bitcoin price"
            >
              ...
            </span>
          ))
        )}
      </p>
      <p className="mt-3 text-sm text-brand-muted">
        {isUpdatingExistingPrice ? (
          <>
            checking latest price
            <span
              aria-hidden="true"
              className="price-loading-dots price-status-dots"
            >
              ...
            </span>
          </>
        ) : (
          <>
            {priceStatus.checkedLabel}
            {priceStatus.refreshLabel ? (
              <>
                <span aria-hidden="true"> · </span>
                {priceStatus.refreshLabel}
              </>
            ) : null}
          </>
        )}
      </p>
      <div
        aria-hidden="true"
        className="price-refresh-progress mt-3"
        style={refreshProgressStyle}
      />
      {lastBet ? (
        <p className="game-last-bet mt-4 text-sm font-semibold text-brand-primary">
          Last bet: <span>{lastBet}</span>
        </p>
      ) : null}
    </section>
  );
};
