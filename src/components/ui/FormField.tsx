import type { InputHTMLAttributes } from 'react';
import { cn } from './cn';

type FormFieldProps = {
  label: string;
  mono?: boolean;
} & Pick<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'placeholder' | 'type' | 'name' | 'disabled' | 'inputMode' | 'autoComplete'>;

export const FormField = ({ label, mono = false, className, type = 'text', ...props }: FormFieldProps & { className?: string }) => {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{label}</span>
      <input
        type={type}
        className={cn(
          'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none',
          mono && 'font-mono text-[13px]',
          className,
        )}
        {...props}
      />
    </label>
  );
};
