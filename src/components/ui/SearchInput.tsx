import type { InputHTMLAttributes } from 'react';
import { cn } from './cn';
import { SearchIcon } from './icons';

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const SearchInput = ({ className, placeholder = 'Поиск', ...props }: SearchInputProps) => {
  return (
    <label className="relative block w-full">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400/90"><SearchIcon className="h-4 w-4" /></span>
      <input
        type="search"
        placeholder={placeholder}
        className={cn(
          'h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition hover:border-slate-300 focus:border-brand focus:ring-2 focus:ring-brand/10 disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      />
    </label>
  );
};
