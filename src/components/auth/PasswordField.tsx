import { useId, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../ui/cn';

type PasswordFieldProps = {
  label: string;
  error?: string;
  helperText?: string;
} & Pick<InputHTMLAttributes<HTMLInputElement>, 'name' | 'value' | 'onChange' | 'autoComplete' | 'placeholder' | 'disabled'>;

export const PasswordField = ({ label, error, helperText, className, disabled, ...props }: PasswordFieldProps & { className?: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  const fieldId = useId();

  return (
    <label htmlFor={fieldId} className="space-y-1">
      <span className="text-[11px] font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">{label}</span>
      <div className="relative">
        <input
          id={fieldId}
          type={isVisible ? 'text' : 'password'}
          disabled={disabled}
          className={cn(
            'app-form-input h-10 w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 pr-20 text-sm text-[var(--color-input-text)] placeholder:text-[var(--color-input-placeholder)] shadow-sm outline-none transition hover:border-[var(--color-primary)]/40 focus:border-[var(--color-input-focus)] focus:ring-2 focus:ring-[var(--color-input-focus)]/20 disabled:cursor-not-allowed disabled:opacity-70',
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          disabled={disabled}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:cursor-not-allowed disabled:text-[var(--color-text-secondary)]"
          aria-label={isVisible ? 'Скрыть пароль' : 'Показать пароль'}
        >
          {isVisible ? 'Скрыть' : 'Показать'}
        </button>
      </div>
      {error ? <span className="text-xs text-[var(--color-danger)]">{error}</span> : null}
      {!error && helperText ? <span className="text-xs text-[var(--color-text-secondary)]">{helperText}</span> : null}
    </label>
  );
};
