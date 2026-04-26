import { cn } from './cn';

type BooleanSelectProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

export const BooleanSelect = ({ label, value, onChange }: BooleanSelectProps) => {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">{label}</span>
      <select
        value={value ? 'true' : 'false'}
        onChange={(event) => onChange(event.target.value === 'true')}
        className={cn(
          'app-form-input app-form-select h-10 w-full rounded-lg px-3 pr-9 text-sm',
        )}
      >
        <option value="true">Да</option>
        <option value="false">Нет</option>
      </select>
    </label>
  );
};
