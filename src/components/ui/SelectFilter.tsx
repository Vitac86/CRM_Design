import type { SelectHTMLAttributes } from 'react';
import { cn } from './cn';

type SelectFilterProps = SelectHTMLAttributes<HTMLSelectElement>;

export const SelectFilter = ({ className, children, ...props }: SelectFilterProps) => {
  return (
    <select
      className={cn(
        'app-form-input app-form-select h-10 w-full min-w-0 max-w-full rounded-lg px-3 pr-9 text-sm font-medium sm:w-auto sm:min-w-[180px]',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
};
