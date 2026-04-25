import type { InputHTMLAttributes } from 'react';
import { cn } from './cn';
import { SearchIcon } from './icons';

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  inputClassName?: string;
};

export const SearchInput = ({ className, inputClassName, placeholder = 'Поиск', ...props }: SearchInputProps) => {
  return (
    <label className={cn('relative block min-w-0 w-full', className)}>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--color-text-secondary)]/90"><SearchIcon className="h-4 w-4" /></span>
      <input
        type="search"
        placeholder={placeholder}
        className={cn(
          'h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input)] pl-9 pr-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] shadow-sm outline-none transition hover:border-[var(--color-primary)]/40 focus:border-[var(--color-focus)] focus:ring-2 focus:ring-[var(--color-focus)]/20 disabled:cursor-not-allowed disabled:opacity-60',
          inputClassName,
        )}
        {...props}
      />
    </label>
  );
};
