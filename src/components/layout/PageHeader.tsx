import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../ui/cn';

type PageHeaderProps = HTMLAttributes<HTMLElement> & {
  title: ReactNode;
  actions?: ReactNode;
};

export const PageHeader = ({ title, actions, className, ...props }: PageHeaderProps) => {
  return (
    <header className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)} {...props}>
      <h1 className="font-heading text-2xl font-semibold text-[var(--color-text-primary)]">{title}</h1>
      {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div> : null}
    </header>
  );
};
