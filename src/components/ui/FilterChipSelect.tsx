import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from './cn';

type FilterChipOption = {
  value: string;
  label: string;
};

type FilterChipSelectProps = {
  label: string;
  value: string;
  displayValue: string;
  options: FilterChipOption[];
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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();

  const isActive = useMemo(() => active || value !== 'all', [active, value]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current) {
        return;
      }

      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleOptionSelect = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className={cn(
          'inline-flex h-9 min-w-[180px] items-center rounded-full border bg-slate-50 px-3 text-sm font-medium text-slate-700 shadow-sm transition',
          'hover:border-slate-300 hover:bg-white',
          isActive ? 'border-brand/25 bg-brand/5 text-brand-dark ring-1 ring-brand/10' : 'border-slate-200',
          open && 'border-brand/40 ring-2 ring-brand/10',
        )}
      >
        <span className="truncate">{label}: {displayValue}</span>
        <svg
          className={cn('ml-2 h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')}
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 top-full z-50 mt-2 max-h-64 min-w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
          style={{ width: 'max-content' }}
        >
          {options.map((option) => {
            const selected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => handleOptionSelect(option.value)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition',
                  'hover:bg-slate-50 hover:text-slate-900',
                  selected && 'bg-brand/5 font-medium text-brand-dark',
                )}
              >
                <span>{option.label}</span>
                {selected ? (
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M5 10.5L8.5 14L15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
