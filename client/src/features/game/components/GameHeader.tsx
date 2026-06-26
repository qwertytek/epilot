import type { GameHeaderProps } from '../game.types';

export const GameHeader = ({ score }: GameHeaderProps) => (
  <header className="flex flex-wrap items-start justify-between gap-5">
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-secondary">
        Market challenge
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
        Bitcoin direction
      </h1>
      <p className="mt-2 max-w-xl text-brand-muted">
        Predict the direction of BTC/USD over the next 60 seconds
      </p>
    </div>

    <div className="rounded-xl border border-brand-border bg-brand-blueSoft px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
        Score
      </p>
      {score === null ? (
        <span className="score-skeleton mt-2" aria-label="Loading score" />
      ) : (
        <p className="mt-1 text-2xl font-bold text-brand-navy">{score}</p>
      )}
    </div>
  </header>
);
