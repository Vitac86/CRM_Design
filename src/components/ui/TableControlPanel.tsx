import type { ReactNode } from 'react';
import { cn } from './cn';

type TableControlPanelProps = {
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
  searchClassName?: string;
  filtersClassName?: string;
  actionsClassName?: string;
};

export const TableControlPanel = ({
  search,
  filters,
  actions,
  className,
  searchClassName,
  filtersClassName,
  actionsClassName,
}: TableControlPanelProps) => {
  const hasSecondRow = Boolean(filters) || Boolean(actions);

  return (
    <section className={cn('space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-muted-surface)] p-3 shadow-sm sm:p-4', className)}>
      {search ? (
        <div className={cn('min-w-0 w-full max-w-[520px]', searchClassName)}>
          {search}
        </div>
      ) : null}

      {hasSecondRow ? (
        <div className={cn('flex min-w-0 flex-wrap items-center gap-2 sm:gap-3', filtersClassName)}>
          {filters}
          {actions ? <div className={cn('ml-auto flex flex-wrap items-center gap-2', actionsClassName)}>{actions}</div> : null}
        </div>
      ) : null}
    </section>
  );
};
