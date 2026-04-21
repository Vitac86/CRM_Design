import { cn } from '../ui/cn';

type ProfileFieldProps = {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
};

export const ProfileField = ({ label, value, mono = false, className }: ProfileFieldProps) => {
  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
      <p className={cn('text-sm font-medium text-slate-900', mono && 'font-mono text-[13px]')}>{value || '—'}</p>
    </div>
  );
};
