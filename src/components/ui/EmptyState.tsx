import type { ReactNode } from 'react';
import { cn } from './cn';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export const EmptyState = ({ title, description, icon, action, className }: EmptyStateProps) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-card)] px-6 py-10 text-center',
        className,
      )}
    >
      {icon ? <div className="mb-3 text-3xl text-[var(--color-text-secondary)]">{icon}</div> : null}
      <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-sm text-[var(--color-text-secondary)]">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
};
