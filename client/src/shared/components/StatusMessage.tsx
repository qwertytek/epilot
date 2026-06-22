import type { ReactNode } from 'react';

type StatusMessageProps = {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'error';
};

const toneClasses = {
  neutral: 'border-brand-border bg-brand-soft text-brand-navy',
  success: 'border-brand-border bg-white text-brand-success',
  error: 'border-brand-secondary/30 bg-white text-brand-secondary',
};

export const StatusMessage = ({
  children,
  tone = 'neutral',
}: StatusMessageProps) => (
  <div
    className={`rounded-xl border px-4 py-3 text-sm font-medium ${toneClasses[tone]}`}
    role="status"
  >
    {children}
  </div>
);
