import type { HTMLAttributes } from 'react';
import { cn } from './cn';

type FilterBarProps = HTMLAttributes<HTMLDivElement>;

export const FilterBar = ({ className, ...props }: FilterBarProps) => {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm',
        className,
      )}
      {...props}
    />
  );
};
