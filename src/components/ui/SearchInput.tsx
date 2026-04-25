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
          'font-display h-10 w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] pl-9 pr-3 text-sm text-[var(--color-input-text)] placeholder:text-[var(--color-input-placeholder)] shadow-sm outline-none transition hover:border-[var(--color-primary)]/40 focus:border-[var(--color-input-focus)] focus:ring-2 focus:ring-[var(--color-input-focus)]/20 disabled:cursor-not-allowed disabled:opacity-70',
          inputClassName,
        )}
        {...props}
      />
    </label>
  );
};
