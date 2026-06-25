import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-primary text-white hover:opacity-90',
  secondary: 'bg-brand-blueSoft text-brand-primary hover:bg-brand-border',
};

export const Button = ({
  children,
  className = '',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) => (
  <button
    className={`rounded-xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${variantClasses[variant]} ${className}`}
    type={type}
    {...props}
  >
    {children}
  </button>
);
