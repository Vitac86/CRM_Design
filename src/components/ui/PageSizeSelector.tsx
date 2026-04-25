import { cn } from './cn';

type PageSizeSelectorProps = {
  value: number;
  options?: number[];
  onChange: (value: number) => void;
  className?: string;
};

export const PageSizeSelector = ({ value, options = [25, 50, 100], onChange, className }: PageSizeSelectorProps) => {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-secondary)]', className)}>
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Строк на странице</span>
      <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
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
                  ? 'border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-accent)]'
                  : 'border border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)]',
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
