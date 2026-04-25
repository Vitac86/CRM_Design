import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'purple' | 'orange' | 'brand';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  success:
    'bg-[color:color-mix(in_srgb,var(--color-success)_11%,var(--color-surface))] text-[color:color-mix(in_srgb,var(--color-success)_72%,var(--color-text-primary))] border-[color:color-mix(in_srgb,var(--color-success)_28%,var(--color-border))]',
  warning:
    'bg-[color:color-mix(in_srgb,var(--color-warning)_11%,var(--color-surface))] text-[color:color-mix(in_srgb,var(--color-warning)_70%,var(--color-text-primary))] border-[color:color-mix(in_srgb,var(--color-warning)_28%,var(--color-border))]',
  danger:
    'bg-[color:color-mix(in_srgb,var(--color-danger)_10%,var(--color-surface))] text-[color:color-mix(in_srgb,var(--color-danger)_70%,var(--color-text-primary))] border-[color:color-mix(in_srgb,var(--color-danger)_28%,var(--color-border))]',
  neutral:
    'bg-[color:color-mix(in_srgb,var(--color-muted-surface)_55%,transparent)] text-[var(--color-text-secondary)] border-[color:color-mix(in_srgb,var(--color-text-secondary)_18%,var(--color-border))]',
  info:
    'bg-[color:color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))] text-[color:color-mix(in_srgb,var(--color-primary)_66%,var(--color-text-primary))] border-[color:color-mix(in_srgb,var(--color-primary)_26%,var(--color-border))]',
  purple:
    'bg-[color:color-mix(in_srgb,var(--color-primary)_8%,var(--color-surface))] text-[color:color-mix(in_srgb,var(--color-primary)_62%,var(--color-text-primary))] border-[color:color-mix(in_srgb,var(--color-primary)_22%,var(--color-border))]',
  orange:
    'bg-[color:color-mix(in_srgb,var(--color-warning)_9%,var(--color-surface))] text-[color:color-mix(in_srgb,var(--color-warning)_64%,var(--color-text-primary))] border-[color:color-mix(in_srgb,var(--color-warning)_24%,var(--color-border))]',
  brand:
    'bg-[color:color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[color:color-mix(in_srgb,var(--color-primary)_72%,var(--color-text-primary))] border-[color:color-mix(in_srgb,var(--color-primary)_28%,var(--color-border))]',
};

export const Badge = ({ variant = 'neutral', className, ...props }: BadgeProps) => {
  return (
    <span
      className={cn(
        'font-display inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium leading-5 whitespace-nowrap',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
};
