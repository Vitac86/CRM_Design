import type { HTMLAttributes } from 'react';
import { cn } from './cn';

type FilterBarProps = HTMLAttributes<HTMLDivElement>;

export const FilterBar = ({ className, ...props }: FilterBarProps) => {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-[var(--density-filter-gap)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-muted-surface)] p-[var(--density-panel-padding)] shadow-sm',
        className,
      )}
      {...props}
    />
  );
};
