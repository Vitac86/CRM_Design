import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'purple' | 'orange' | 'brand';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  success:
    'bg-[color:color-mix(in_srgb,var(--color-success)_10%,transparent)] text-[color:color-mix(in_srgb,var(--color-success)_74%,var(--color-text-primary))] border-[color:color-mix(in_srgb,var(--color-success)_30%,var(--color-border))]',
  warning:
    'bg-[color:color-mix(in_srgb,var(--color-warning)_10%,transparent)] text-[color:color-mix(in_srgb,var(--color-warning)_68%,var(--color-text-primary))] border-[color:color-mix(in_srgb,var(--color-warning)_30%,var(--color-border))]',
  danger:
    'bg-[color:color-mix(in_srgb,var(--color-danger)_9%,transparent)] text-[color:color-mix(in_srgb,var(--color-danger)_68%,var(--color-text-primary))] border-[color:color-mix(in_srgb,var(--color-danger)_30%,var(--color-border))]',
  neutral:
    'bg-[color:color-mix(in_srgb,var(--color-muted-surface)_55%,transparent)] text-[var(--color-text-secondary)] border-[color:color-mix(in_srgb,var(--color-text-secondary)_18%,var(--color-border))]',
  info:
    'bg-[color:color-mix(in_srgb,var(--color-primary)_9%,transparent)] text-[color:color-mix(in_srgb,var(--color-primary)_68%,var(--color-text-primary))] border-[color:color-mix(in_srgb,var(--color-primary)_24%,var(--color-border))]',
  purple:
    'bg-[color:color-mix(in_srgb,var(--color-primary)_7%,transparent)] text-[var(--color-text-secondary)] border-[color:color-mix(in_srgb,var(--color-primary)_18%,var(--color-border))]',
  orange:
    'bg-[color:color-mix(in_srgb,var(--color-warning)_8%,transparent)] text-[var(--color-text-secondary)] border-[color:color-mix(in_srgb,var(--color-warning)_22%,var(--color-border))]',
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
