import type { HTMLAttributes } from 'react';
import { cn } from '../ui/cn';

type PageShellProps = HTMLAttributes<HTMLDivElement>;

export const PageShell = ({ className, ...props }: PageShellProps) => {
  return (
    <div
      className={cn(
        'min-w-0 space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5',
        className,
      )}
      {...props}
    />
  );
};
