import { cn } from './cn';

type ActiveFilterChipProps = {
  label: string;
  value: string;
  onRemove: () => void;
  className?: string;
};

export const ActiveFilterChip = ({ label, value, onRemove, className }: ActiveFilterChipProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-accent)] transition hover:bg-[var(--color-primary)]/20',
        className,
      )}
    >
      <span className="max-w-[240px] truncate">{label}: {value}</span>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[var(--color-accent)]/85 transition hover:bg-[var(--color-primary)]/20 hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]/30"
        aria-label={`Сбросить фильтр ${label}`}
      >
        <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </span>
  );
};
