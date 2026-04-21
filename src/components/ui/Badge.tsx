import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'purple' | 'orange';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-100 text-amber-700 border border-amber-200',
  danger: 'bg-red-100 text-red-700 border border-red-200',
  neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
  info: 'bg-sky-100 text-sky-700 border border-sky-200',
  purple: 'bg-violet-100 text-violet-700 border border-violet-200',
  orange: 'bg-orange-100 text-orange-700 border border-orange-200',
};

export const Badge = ({ variant = 'neutral', className, ...props }: BadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase leading-none tracking-wide',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
};
