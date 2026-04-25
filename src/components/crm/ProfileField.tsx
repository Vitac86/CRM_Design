import { cn } from '../ui/cn';

type ProfileFieldProps = {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
};

export const ProfileField = ({ label, value, mono = false, className }: ProfileFieldProps) => {
  return (
    <div className={cn('space-y-0.5', className)}>
      <p className="text-[11px] font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">{label}</p>
      <p className={cn('text-sm font-medium leading-5 text-[var(--color-text-primary)]', mono && 'font-mono text-[13px]')}>{value || '—'}</p>
    </div>
  );
};
