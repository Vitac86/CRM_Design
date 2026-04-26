import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

type FormFieldProps = {
  label: string;
  mono?: boolean;
  helperText?: string;
  error?: string;
  multiline?: boolean;
  textareaClassName?: string;
} & Pick<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur' | 'onKeyDown' | 'onPaste' | 'placeholder' | 'type' | 'name' | 'disabled' | 'inputMode' | 'autoComplete'>
  & Pick<TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'>;

export const FormField = ({
  label,
  mono = false,
  className,
  textareaClassName,
  type = 'text',
  helperText,
  error,
  multiline = false,
  rows = 3,
  ...props
}: FormFieldProps & { className?: string }) => {
  const baseClassName = cn(
    'app-form-input h-10 w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 text-sm text-[var(--color-input-text)] placeholder:text-[var(--color-input-placeholder)] shadow-sm outline-none transition hover:border-[var(--color-primary)]/40 focus:border-[var(--color-input-focus)] focus:ring-2 focus:ring-[var(--color-input-focus)]/20 disabled:cursor-not-allowed disabled:opacity-70',
    mono && 'font-mono text-[13px]',
  );

  return (
    <label className="space-y-1">
      <span className="text-[11px] font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">{label}</span>
      {multiline ? (
        <textarea
          rows={rows}
          className={cn(baseClassName, 'min-h-24 py-2', className, textareaClassName)}
          {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          type={type}
          className={cn(baseClassName, className)}
          {...props}
        />
      )}
      {error ? <span className="text-xs text-[var(--color-danger)]">{error}</span> : null}
      {!error && helperText ? <span className="text-xs text-[var(--color-text-secondary)]">{helperText}</span> : null}
    </label>
  );
};
