import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border border-[var(--color-primary)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-accent)] focus-visible:ring-[var(--color-focus)]/40',
  secondary:
    'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/35 hover:bg-[var(--color-hover)] hover:text-[var(--color-text-primary)] focus-visible:ring-[var(--color-focus)]/20',
  ghost: 'border border-transparent bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)] focus-visible:ring-[var(--color-focus)]/25',
  danger: 'bg-red-600 text-white border border-red-600 hover:bg-red-700 focus-visible:ring-red-300/50',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
};

export const Button = ({ variant = 'primary', size = 'md', className, type = 'button', ...props }: ButtonProps) => {
  return (
    <button
      type={type}
      className={cn(
        'font-display inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
};
