import type { PendingGuessProps } from '../types';

export const PendingGuess = ({
  direction,
  eligibleAt,
  headingId,
}: PendingGuessProps) => (
  <section className="rounded-2xl border border-brand-border bg-brand-blueSoft p-5">
    <p className="text-sm font-semibold text-brand-primary" id={headingId}>
      Guess submitted
    </p>
    <p className="mt-2 text-lg font-semibold text-brand-navy">
      You predicted the price will go {direction}.
    </p>
    <p className="mt-2 text-sm text-brand-muted">
      Result eligible at {eligibleAt}.
    </p>
  </section>
);
