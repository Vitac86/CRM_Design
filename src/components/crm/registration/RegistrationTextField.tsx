import type { InputHTMLAttributes } from 'react';
import { cn } from '../../ui/cn';

type RegistrationTextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export const RegistrationTextField = ({ label, id, className, ...props }: RegistrationTextFieldProps) => {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-slate-700" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        className={cn(
          'app-form-input h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20',
          className,
        )}
        {...props}
      />
    </label>
  );
};
