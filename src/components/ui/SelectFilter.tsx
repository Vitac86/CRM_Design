import type { SelectHTMLAttributes } from 'react';
import { cn } from './cn';

type SelectFilterProps = SelectHTMLAttributes<HTMLSelectElement>;

export const SelectFilter = ({ className, children, ...props }: SelectFilterProps) => {
  return (
    <select
      className={cn(
        'h-9 min-w-[160px] rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
};
