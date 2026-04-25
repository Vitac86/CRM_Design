import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'purple' | 'orange' | 'brand';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  danger: 'bg-rose-50 text-rose-700 border-rose-100',
  neutral: 'bg-[var(--color-muted-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)]',
  info: 'bg-sky-50 text-sky-700 border-sky-100',
  purple: 'bg-violet-50 text-violet-700 border-violet-100',
  orange: 'bg-orange-50 text-orange-700 border-orange-100',
  brand: 'bg-[var(--color-primary)]/10 text-[var(--color-accent)] border-[var(--color-primary)]/25',
};

export const Badge = ({ variant = 'neutral', className, ...props }: BadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium leading-5 whitespace-nowrap',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
};
