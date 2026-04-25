import { Link } from 'react-router-dom';
import type { DashboardMetric } from '../../data/dashboard';

interface MetricCardProps {
  metric: DashboardMetric;
}

export const MetricCard = ({ metric }: MetricCardProps) => {
  const trendClass = metric.trendType === 'up' ? 'text-[var(--color-accent)]' : 'text-[var(--color-danger)]';
  const IconComponent = metric.icon;

  const card = (
    <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]" aria-hidden="true">
          <IconComponent className="h-5 w-5" />
        </div>
        <span className={`text-xs font-semibold ${trendClass}`}>{metric.trendLabel}</span>
      </div>

      <p className="text-2xl font-semibold text-[var(--color-text-primary)]">{metric.value}</p>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{metric.label}</p>
    </article>
  );

  if (!metric.to) {
    return card;
  }

  return (
    <Link className="block rounded-xl transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]/30" to={metric.to}>
      {card}
    </Link>
  );
};
