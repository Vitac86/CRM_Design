import type { InputHTMLAttributes } from 'react';
import { cn } from '../../ui/cn';

type RegistrationTextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export const RegistrationTextField = ({ label, id, className, ...props }: RegistrationTextFieldProps) => {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-[var(--color-text-secondary)]" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        className={cn(
          'app-form-input h-10 rounded-md px-3 text-sm',
          className,
        )}
        {...props}
      />
    </label>
  );
};
