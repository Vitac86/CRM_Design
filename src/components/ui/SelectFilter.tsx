import type { SelectHTMLAttributes } from 'react';
import { cn } from './cn';

type SelectFilterProps = SelectHTMLAttributes<HTMLSelectElement>;

export const SelectFilter = ({ className, children, ...props }: SelectFilterProps) => {
  return (
    <select
      className={cn(
        'h-10 w-full min-w-0 max-w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input)] px-3 pr-9 text-sm font-medium text-[var(--color-text-primary)] shadow-sm outline-none transition hover:border-[var(--color-primary)]/40 focus:border-[var(--color-focus)] focus:ring-2 focus:ring-[var(--color-focus)]/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[180px]',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
};
