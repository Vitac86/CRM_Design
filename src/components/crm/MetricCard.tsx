import type { DashboardMetric } from '../../data/dashboard';

interface MetricCardProps {
  metric: DashboardMetric;
}

export const MetricCard = ({ metric }: MetricCardProps) => {
  const trendClass = metric.trendType === 'up' ? 'text-brand' : 'text-rose-600';

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light text-base" aria-hidden="true">
          {metric.icon}
        </div>
        <span className={`text-xs font-semibold ${trendClass}`}>{metric.trendLabel}</span>
      </div>

      <p className="text-2xl font-semibold text-slate-900">{metric.value}</p>
      <p className="mt-1 text-sm text-slate-600">{metric.label}</p>
    </article>
  );
};
