import type { HTMLAttributes } from 'react';
import { cn } from '../ui/cn';

type PageSectionProps = HTMLAttributes<HTMLElement>;

export const PageSection = ({ className, ...props }: PageSectionProps) => {
  return (
    <section
      className={cn(
        'min-w-0 space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-[var(--density-panel-padding)] shadow-sm',
        className,
      )}
      {...props}
    />
  );
};
