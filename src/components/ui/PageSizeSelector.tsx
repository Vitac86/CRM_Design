import { cn } from './cn';

type PageSizeSelectorProps = {
  value: number;
  options?: number[];
  onChange: (value: number) => void;
  className?: string;
};

export const PageSizeSelector = ({ value, options = [25, 50, 100], onChange, className }: PageSizeSelectorProps) => {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-slate-600', className)}>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Строк на странице</span>
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
        {options.map((option) => {
          const active = option === value;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition',
                active
                  ? 'border border-brand/25 bg-brand/5 text-brand-dark'
                  : 'border border-transparent text-slate-600 hover:bg-slate-50',
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
};
