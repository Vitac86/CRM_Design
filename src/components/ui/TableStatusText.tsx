import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export type TableStatusTone = 'neutral' | 'subtle' | 'warning' | 'danger';

type TableStatusTextProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: TableStatusTone;
};

const toneClasses: Record<TableStatusTone, string> = {
  neutral:
    'bg-[color:color-mix(in_srgb,var(--color-muted-surface)_55%,transparent)] text-[var(--color-text-secondary)] border-[color:color-mix(in_srgb,var(--color-text-secondary)_18%,var(--color-border))]',
  subtle:
    'bg-[color:color-mix(in_srgb,var(--color-muted-surface)_65%,transparent)] text-[var(--color-text-secondary)] border-[color:color-mix(in_srgb,var(--color-text-secondary)_14%,var(--color-border))]',
  warning:
    'bg-[color:color-mix(in_srgb,var(--color-warning)_10%,var(--color-surface))] text-[color:color-mix(in_srgb,var(--color-warning)_70%,var(--color-text-primary))] border-[color:color-mix(in_srgb,var(--color-warning)_24%,var(--color-border))]',
  danger:
    'bg-[color:color-mix(in_srgb,var(--color-danger)_10%,var(--color-surface))] text-[color:color-mix(in_srgb,var(--color-danger)_70%,var(--color-text-primary))] border-[color:color-mix(in_srgb,var(--color-danger)_24%,var(--color-border))]',
};

export const TableStatusText = ({ tone = 'neutral', className, ...props }: TableStatusTextProps) => {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-md border px-1.5 py-0 text-xs font-medium leading-4 whitespace-nowrap',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
};
