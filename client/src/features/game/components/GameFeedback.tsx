import { StatusMessage } from '../../../shared/components/StatusMessage';
import type { GameFeedbackProps } from '../game.types';

export const GameFeedback = ({
  message,
  tone = 'neutral',
}: GameFeedbackProps) => <StatusMessage tone={tone}>{message}</StatusMessage>;
