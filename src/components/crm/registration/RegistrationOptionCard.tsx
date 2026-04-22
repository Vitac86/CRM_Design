import type { ReactNode } from 'react';
import { cn } from '../../ui/cn';

type RegistrationOptionCardProps = {
  title: string;
  description?: string;
  selected: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  onClick: () => void;
};

export const RegistrationOptionCard = ({
  title,
  description,
  selected,
  disabled = false,
  icon,
  onClick,
}: RegistrationOptionCardProps) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full flex-col gap-2 rounded-lg border p-4 text-left transition-colors',
        selected ? 'border-brand bg-brand-light' : 'border-slate-200 bg-white hover:border-slate-300',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      )}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-base font-semibold text-slate-900">{title}</span>
      </div>
      {description ? <p className="text-sm text-slate-500">{description}</p> : null}
    </button>
  );
};
