export const GuessStateSkeleton = () => (
  <section
    aria-label="Loading prediction state"
    className="game-guess-panel"
    aria-busy="true"
  >
    <div className="guess-state-skeleton-line guess-state-skeleton-kicker" />
    <div className="guess-state-skeleton-line guess-state-skeleton-heading" />
    <div className="guess-state-skeleton-line guess-state-skeleton-copy" />

    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <div className="guess-state-skeleton-button" />
      <div className="guess-state-skeleton-button" />
    </div>
  </section>
);
