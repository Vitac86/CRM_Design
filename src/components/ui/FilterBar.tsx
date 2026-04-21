import type { HTMLAttributes } from 'react';
import { cn } from './cn';

type FilterBarProps = HTMLAttributes<HTMLDivElement>;

export const FilterBar = ({ className, ...props }: FilterBarProps) => {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2',
        className,
      )}
      {...props}
    />
  );
};
