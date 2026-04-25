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
          'h-10 w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 text-sm text-[var(--color-input-text)] placeholder:text-[var(--color-input-placeholder)] focus:border-[var(--color-input-focus)] focus:ring-2 focus:ring-[var(--color-input-focus)]/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70',
          mono && 'font-mono text-[13px]',
          className,
        )}
        {...props}
      />
    </label>
  );
};
