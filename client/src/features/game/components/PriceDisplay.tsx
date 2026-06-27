import type { PriceDisplayProps } from '../game.types';

export const PriceDisplay = ({
  isRefreshing = false,
  isStale = false,
  onRefresh,
  price,
  updatedAt,
}: PriceDisplayProps) => (
  <section
    aria-labelledby="latest-price-heading"
    className={`game-price-panel${isStale ? ' is-stale' : ''}`}
  >
    <p
      className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-secondary"
      id="latest-price-heading"
    >
      Latest BTC / USD
    </p>
    <p className="mt-4 text-4xl font-bold tracking-tight text-brand-navy sm:text-5xl">
      {price ?? (
        <span className="price-loading-dots" aria-label="Loading Bitcoin price">
          ...
        </span>
      )}
    </p>
    <p className="mt-3 text-sm text-brand-muted">
      {updatedAt ? `Snapshot ${updatedAt}` : 'Snapshot pending'}
    </p>
    {isStale ? (
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
