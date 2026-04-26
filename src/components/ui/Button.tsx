import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'crm-button-primary border border-[var(--color-button-primary-bg)] bg-[var(--color-button-primary-bg)] text-[var(--color-button-primary-text)] hover:border-[var(--color-button-primary-hover)] hover:bg-[var(--color-button-primary-hover)] active:border-[var(--color-button-primary-active)] active:bg-[var(--color-button-primary-active)]',
  secondary:
    'border border-[var(--color-button-secondary-border)] bg-[var(--color-button-secondary-bg)] text-[var(--color-button-secondary-text)] hover:border-[var(--color-button-secondary-hover-border)] hover:bg-[var(--color-button-secondary-hover-bg)] hover:text-[var(--color-button-secondary-hover-text)] active:border-[var(--color-button-secondary-active-border)] active:bg-[var(--color-button-secondary-active-bg)] active:text-[var(--color-button-secondary-active-text)]',
  ghost:
    'border border-transparent bg-[var(--color-button-ghost-bg)] text-[var(--color-button-ghost-text)] hover:border-[var(--color-button-ghost-hover-border)] hover:bg-[var(--color-button-ghost-hover-bg)] hover:text-[var(--color-button-ghost-hover-text)] active:border-[var(--color-button-ghost-active-border)] active:bg-[var(--color-button-ghost-active-bg)]',
  danger:
    'border border-[var(--color-button-danger-bg)] bg-[var(--color-button-danger-bg)] text-[var(--color-button-danger-text)] hover:border-[var(--color-button-danger-hover)] hover:bg-[var(--color-button-danger-hover)] active:border-[var(--color-button-danger-active)] active:bg-[var(--color-button-danger-active)]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-[var(--density-button-sm-height)] px-[var(--density-button-sm-px)] text-xs',
  md: 'h-[var(--density-button-md-height)] px-[var(--density-button-md-px)] text-sm',
};

export const Button = ({ variant = 'primary', size = 'md', className, type = 'button', ...props }: ButtonProps) => {
  return (
    <button
      type={type}
      className={cn(
        "font-display inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-button-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-[var(--color-button-disabled-border)] disabled:bg-[var(--color-button-disabled-bg)] disabled:text-[var(--color-button-disabled-text)] [&[aria-pressed='true']]:border-[var(--color-button-selected-border)] [&[aria-pressed='true']]:bg-[var(--color-button-selected-bg)] [&[aria-pressed='true']]:text-[var(--color-button-selected-text)] [&[aria-pressed='true']]:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-button-selected-text)_12%,transparent),0_0_0_2px_color-mix(in_srgb,var(--color-button-focus-ring)_20%,transparent)]",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
};
