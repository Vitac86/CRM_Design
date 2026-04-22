import type { DashboardMetric } from '../../data/dashboard';

interface MetricCardProps {
  metric: DashboardMetric;
}

export const MetricCard = ({ metric }: MetricCardProps) => {
  const trendClass = metric.trendType === 'up' ? 'text-brand' : 'text-rose-600';
  const IconComponent = metric.icon;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/5 text-brand" aria-hidden="true">
          <IconComponent className="h-5 w-5" />
        </div>
        <span className={`text-xs font-semibold ${trendClass}`}>{metric.trendLabel}</span>
      </div>

      <p className="text-2xl font-semibold text-slate-900">{metric.value}</p>
      <p className="mt-1 text-sm text-slate-600">{metric.label}</p>
    </article>
  );
};
