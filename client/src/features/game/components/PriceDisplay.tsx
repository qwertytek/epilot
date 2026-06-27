import type { PriceDisplayProps } from '../game.types';

export const PriceDisplay = ({
  animationBlink = 'repeat',
  animationKey,
  animationPreviousPrice,
  animationTone,
  isRefreshing = false,
  isStale = false,
  lastBet,
  onRefresh,
  price,
  updatedAt,
}: PriceDisplayProps) => {
  const isUpdatingExistingPrice = isRefreshing && price !== null;
  const shouldAnimatePrice =
    animationKey !== undefined &&
    animationPreviousPrice !== undefined &&
    animationTone !== undefined &&
    price !== null &&
    animationPreviousPrice !== price;

  return (
    <section
      aria-busy={isRefreshing}
      aria-labelledby="latest-price-heading"
      className={`game-price-panel${
        isStale && !isUpdatingExistingPrice ? ' is-stale' : ''
      }`}
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
            updating price
            <span
              aria-hidden="true"
              className="price-loading-dots price-status-dots"
            >
              ...
            </span>
          </>
        ) : updatedAt ? (
          `Snapshot ${updatedAt}`
        ) : (
          'Snapshot pending'
        )}
      </p>
      {lastBet ? (
        <p className="game-last-bet mt-4 text-sm font-semibold text-brand-primary">
          Last bet: <span>{lastBet}</span>
        </p>
      ) : null}
      {isStale && !isUpdatingExistingPrice ? (
        <div className="price-stale-overlay">
          <button
            aria-label="Refresh latest Bitcoin price"
            className="price-refresh-button"
            disabled={isRefreshing}
            onClick={onRefresh}
            type="button"
          >
            <span aria-hidden="true" className="price-refresh-icon">
              ↻
            </span>
          </button>
        </div>
      ) : null}
    </section>
  );
};
