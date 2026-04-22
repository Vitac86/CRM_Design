import { cn } from './cn';

type FilterOption = {
  value: string;
  label: string;
};

type FilterChipSelectProps = {
  label: string;
  value: string;
  displayValue: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  active?: boolean;
  className?: string;
};

export const FilterChipSelect = ({
  label,
  value,
  displayValue,
  options,
  onChange,
  active = false,
  className,
}: FilterChipSelectProps) => {
  return (
    <label
      className={cn(
        'relative inline-flex h-9 min-w-[180px] items-center rounded-full border bg-slate-50 pl-3 pr-8 text-sm font-medium text-slate-700 shadow-sm transition',
        'hover:border-slate-300 hover:bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10',
        active
          ? 'border-brand/25 bg-brand/5 text-brand-dark ring-1 ring-brand/10'
          : 'border-slate-200',
        className,
      )}
    >
      <span className="truncate">{label}: {displayValue}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full bg-transparent text-transparent outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
};
