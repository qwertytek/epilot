import type { BehindTheScenesCardProps } from '../game.types';
import { GameFeedback } from './GameFeedback';

export const BehindTheScenesCard = ({
  feedbackMessages,
}: BehindTheScenesCardProps) => (
  <section
    className="behind-scenes-card mt-4"
    aria-label="Behind the scenes"
    aria-live="polite"
  >
    <div className="grid gap-3">
      {feedbackMessages.length > 0 ? (
        feedbackMessages.map((message) => (
          <GameFeedback key={message} message={message} />
        ))
      ) : (
        <GameFeedback message="No background activity right now." />
      )}
    </div>
  </section>
);
