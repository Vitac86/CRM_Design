import type { SelectHTMLAttributes } from 'react';
import { cn } from './cn';

type SelectFilterProps = SelectHTMLAttributes<HTMLSelectElement>;

export const SelectFilter = ({ className, children, ...props }: SelectFilterProps) => {
  return (
    <select
      className={cn(
        'h-10 w-full min-w-0 sm:w-auto sm:min-w-[180px] max-w-full rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-brand focus:ring-2 focus:ring-brand/10 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
};
