import type { ActiveGuess, GuessDirection } from '@epilot/api-contract';

import { formatDateTime } from '#src/shared/utils/formatters';
import { GuessControls } from './GuessControls';
import { GuessStateSkeleton } from './GuessStateSkeleton';
import { PendingGuess } from './PendingGuess';

type GuessPanelProps = {
  activeGuess: ActiveGuess | null;
  disabled: boolean;
  disabledReason: string | null;
  isGameStateKnown: boolean;
  onGuess: (direction: GuessDirection) => void;
  pendingDirection?: GuessDirection;
  resolveWaitSeconds: number;
};

export const GuessPanel = ({
  activeGuess,
  disabled,
  disabledReason,
  isGameStateKnown,
  onGuess,
  pendingDirection,
  resolveWaitSeconds,
}: GuessPanelProps) => {
  if (!isGameStateKnown) {
    return <GuessStateSkeleton />;
  }

  if (activeGuess) {
    return (
      <section
        aria-labelledby="current-guess-heading"
        className="game-guess-panel"
      >
        <div className="game-guess-state grid gap-4">
          <PendingGuess
            direction={activeGuess.direction}
            eligibleAt={formatDateTime(activeGuess.eligibleAt)}
            headingId="current-guess-heading"
          />
          <p className="game-guess-status">
            {disabledReason ?? 'Your previous guess is still being resolved.'}{' '}
            {resolveWaitSeconds > 0
              ? `Checking results in ${resolveWaitSeconds}s.`
              : 'Checking for results...'}
          </p>
        </div>
      </section>
    );
  }

  return (
    <GuessControls
      disabled={disabled}
      disabledReason={disabledReason}
      label="Which way will it move?"
      onGuess={onGuess}
      pendingDirection={pendingDirection}
    />
  );
};
