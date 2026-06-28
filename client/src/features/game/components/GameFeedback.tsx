import { StatusMessage } from '#src/shared/components/StatusMessage';
import type { GameFeedbackProps } from '../types';

export const GameFeedback = ({
  message,
  tone = 'neutral',
}: GameFeedbackProps) => <StatusMessage tone={tone}>{message}</StatusMessage>;
