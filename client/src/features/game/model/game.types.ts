import type { GuessDirection } from '@epilot/api-contract';

export type { GuessDirection };

export type GameHeaderProps = {
  score: number | null;
};

export type PriceDisplayProps = {
  animationBlink?: 'single' | 'repeat';
  animationKey?: string;
  animationPreviousPrice?: string;
  animationTone?: 'success' | 'error' | 'neutral';
  isRefreshing?: boolean;
  lastBet: string | null;
  observedAt: string | null;
  pollIntervalMs: number;
  price: string | null;
};

export type GuessControlsProps = {
  disabled?: boolean;
  disabledReason: string | null;
  label: string;
  onGuess: (direction: GuessDirection) => void;
  pendingDirection?: GuessDirection;
};

export type PendingGuessProps = {
  direction: GuessDirection;
  eligibleAt: string;
};

export type GameFeedbackProps = {
  message: string;
  tone?: 'neutral' | 'success' | 'error';
};
