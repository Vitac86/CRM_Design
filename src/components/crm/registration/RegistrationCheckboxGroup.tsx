import { cn } from '../../ui/cn';

type Option = {
  label: string;
  value: string;
};

type RegistrationCheckboxGroupProps = {
  label: string;
  value: string;
  options: Option[];
  onChange: (nextValue: string) => void;
};

export const RegistrationCheckboxGroup = ({ label, value, options, onChange }: RegistrationCheckboxGroupProps) => {
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-700">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                selected
                  ? 'border-brand bg-brand-light text-brand-dark'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
