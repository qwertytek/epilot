import type { GameWarningNotification } from '#src/hooks/useGameWarnings';
import { GameFeedback } from './GameFeedback';

type GameWarningsProps = {
  warnings: GameWarningNotification[];
};

export const GameWarnings = ({ warnings }: GameWarningsProps) => (
  <div className="game-feedback-region mt-6 grid gap-3" aria-live="polite">
    {warnings.map(({ id, isExiting, message, tone }) => (
      <div
        className={
          isExiting
            ? 'game-feedback-notification is-exiting'
            : 'game-feedback-notification'
        }
        key={id}
      >
        <GameFeedback message={message} tone={tone} />
      </div>
    ))}
  </div>
);
