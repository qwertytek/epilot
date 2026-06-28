import { StatusMessage } from '../../../shared/components/StatusMessage';
import type { GameFeedbackProps } from '../model/game.types';

export const GameFeedback = ({
  message,
  tone = 'neutral',
}: GameFeedbackProps) => <StatusMessage tone={tone}>{message}</StatusMessage>;
