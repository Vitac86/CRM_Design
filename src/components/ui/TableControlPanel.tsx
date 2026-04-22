import type { ReactNode } from 'react';
import { cn } from './cn';

type TableControlPanelProps = {
  search: ReactNode;
  filters: ReactNode;
  activeFilters?: ReactNode;
  className?: string;
};

export const TableControlPanel = ({ search, filters, activeFilters, className }: TableControlPanelProps) => {
  return (
    <section className={cn('space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm', className)}>
      <div>{search}</div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Фильтры</p>
        <div className="flex flex-wrap items-center gap-2">{filters}</div>
      </div>
      {activeFilters ? <div className="pt-0.5">{activeFilters}</div> : null}
    </section>
  );
};
