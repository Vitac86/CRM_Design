import type { SelectHTMLAttributes } from 'react';
import { cn } from './cn';

type SelectFilterProps = SelectHTMLAttributes<HTMLSelectElement>;

export const SelectFilter = ({ className, children, ...props }: SelectFilterProps) => {
  return (
    <select
      className={cn(
        'font-display h-10 w-full min-w-0 max-w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 pr-9 text-sm font-medium text-[var(--color-input-text)] shadow-sm outline-none transition hover:border-[var(--color-primary)]/40 focus:border-[var(--color-input-focus)] focus:ring-2 focus:ring-[var(--color-input-focus)]/20 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:min-w-[180px]',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
};
