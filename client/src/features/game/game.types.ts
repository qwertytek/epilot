import type { GuessDirection } from '@epilot/api-contract';

export type { GuessDirection };

export type GameHeaderProps = {
  score: number;
};

export type PriceDisplayProps = {
  price: string;
  updatedAt: string;
};

export type GuessControlsProps = {
  label: string;
};

export type PendingGuessProps = {
  direction: GuessDirection;
  eligibleAt: string;
};

export type GameFeedbackProps = {
  message: string;
  tone?: 'neutral' | 'success' | 'error';
};
