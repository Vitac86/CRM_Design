import type { ReactNode } from 'react';
import { cn } from './cn';

type TableControlPanelProps = {
  search: ReactNode;
  filters: ReactNode;
  className?: string;
};

export const TableControlPanel = ({ search, filters, className }: TableControlPanelProps) => {
  return (
    <section className={cn('space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm', className)}>
      <div className="min-w-0">{search}</div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">{filters}</div>
    </section>
  );
};
