import type { Feedback } from '@epilot/api-contract';

import { formatDateTime } from '../../shared/utils/formatters.js';
import type { GameFeedbackProps } from './game.types.js';

const getFeedbackMessage = (feedback: Feedback): GameFeedbackProps | null => {
  switch (feedback.type) {
    case 'GUESS_CREATED':
      return {
        message:
          'Guess submitted. Resolve it once the eligibility time passes.',
      };
    case 'NOT_READY':
      return {
        message: `Not ready yet. Try again after ${formatDateTime(
          feedback.retryAt,
        )}.`,
      };
    case 'PRICE_UNCHANGED':
      return {
        message: 'The price was unchanged, so the guess is still open.',
      };
    case 'RESOLVED':
      return {
        message:
          feedback.outcome === 'CORRECT'
            ? `Correct prediction. Score ${feedback.scoreDelta > 0 ? '+' : ''}${
                feedback.scoreDelta
              }.`
            : `Incorrect prediction. Score ${feedback.scoreDelta}.`,
        tone: feedback.outcome === 'CORRECT' ? 'success' : 'error',
      };
    case 'NONE':
      return null;
  }
};

export { getFeedbackMessage };
