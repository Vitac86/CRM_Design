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
          'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none',
        )}
      >
        <option value="true">Да</option>
        <option value="false">Нет</option>
      </select>
    </label>
  );
};
