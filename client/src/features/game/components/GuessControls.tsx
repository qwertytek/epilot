import { Button } from '../../../shared/components/Button';
import type { GuessControlsProps } from '../game.types';

export const GuessControls = ({
  disabled = false,
  label,
  onGuess,
  pendingDirection,
}: GuessControlsProps) => (
  <section aria-labelledby="guess-heading" className="game-guess-panel">
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-secondary">
        Your prediction
      </p>
      <h2
        className="mt-2 text-2xl font-bold tracking-tight text-brand-navy"
        id="guess-heading"
      >
        {label}
      </h2>
      <p className="mt-2 text-sm leading-6 text-brand-muted">
        Choose the direction you expect the next eligible price to move.
      </p>
    </div>

    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <Button
        aria-label="Guess that the Bitcoin price will go up"
        className="game-choice-button"
        disabled={disabled}
        onClick={() => {
          onGuess('UP');
        }}
      >
        <span aria-hidden="true" className="text-lg leading-none">
          ↑
        </span>
        {pendingDirection === 'UP' ? 'Submitting...' : 'Price goes up'}
      </Button>
      <Button
        aria-label="Guess that the Bitcoin price will go down"
        className="game-choice-button"
        disabled={disabled}
        onClick={() => {
          onGuess('DOWN');
        }}
        variant="secondary"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          ↓
        </span>
        {pendingDirection === 'DOWN' ? 'Submitting...' : 'Price goes down'}
      </Button>
    </div>
  </section>
);
