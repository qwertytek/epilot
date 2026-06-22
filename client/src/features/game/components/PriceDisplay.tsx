import type { PriceDisplayProps } from '../game.types';

export const PriceDisplay = ({ price, updatedAt }: PriceDisplayProps) => (
  <section aria-labelledby="latest-price-heading" className="game-price-panel">
    <p
      className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-secondary"
      id="latest-price-heading"
    >
      Latest BTC / USD
    </p>
    <p className="mt-4 text-4xl font-bold tracking-tight text-brand-navy sm:text-5xl">
      {price}
    </p>
    <p className="mt-3 text-sm text-brand-muted">Snapshot {updatedAt}</p>
  </section>
);
