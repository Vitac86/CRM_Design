import type { InputHTMLAttributes } from 'react';
import { cn } from './cn';
import { SearchIcon } from './icons';

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  inputClassName?: string;
};

export const SearchInput = ({ className, inputClassName, placeholder = 'Поиск', ...props }: SearchInputProps) => {
  return (
    <label className={cn('relative block min-w-0 w-full', className)}>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--color-input-icon)]"><SearchIcon className="h-4 w-4" /></span>
      <input
        type="search"
        placeholder={placeholder}
        className={cn(
          'app-form-input h-10 w-full rounded-lg pl-9 pr-3',
          inputClassName,
        )}
        {...props}
      />
    </label>
  );
};
