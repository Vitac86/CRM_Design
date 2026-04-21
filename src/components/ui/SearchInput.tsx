import type { InputHTMLAttributes } from 'react';
import { cn } from './cn';

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const SearchInput = ({ className, placeholder = 'Поиск', ...props }: SearchInputProps) => {
  return (
    <label className="relative block">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">🔎</span>
      <input
        type="search"
        placeholder={placeholder}
        className={cn(
          'h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20',
          className,
        )}
        {...props}
      />
    </label>
  );
};
