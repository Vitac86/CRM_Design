import { cn } from './cn';

type BooleanSelectProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

export const BooleanSelect = ({ label, value, onChange }: BooleanSelectProps) => {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{label}</span>
      <select
        value={value ? 'true' : 'false'}
        onChange={(event) => onChange(event.target.value === 'true')}
        className={cn(
          'h-10 w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 text-sm text-[var(--color-input-text)] focus:border-[var(--color-input-focus)] focus:ring-2 focus:ring-[var(--color-input-focus)]/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70',
        )}
      >
        <option value="true">Да</option>
        <option value="false">Нет</option>
      </select>
    </label>
  );
};
