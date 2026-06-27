import type { GuessDirection } from '@epilot/api-contract';

export type { GuessDirection };

export type GameHeaderProps = {
  score: number | null;
};

export type PriceDisplayProps = {
  animationKey?: string;
  animationPreviousPrice?: string;
  animationTone?: 'success' | 'error';
  isRefreshing?: boolean;
  isStale?: boolean;
  onRefresh: () => void;
  lastBet: string | null;
  price: string | null;
  updatedAt: string | null;
};

export type GuessControlsProps = {
  disabled?: boolean;
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
