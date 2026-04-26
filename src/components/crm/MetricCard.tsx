import { Link } from 'react-router-dom';
import type { DashboardMetric } from '../../data/dashboard';

interface MetricCardProps {
  metric: DashboardMetric;
}

export const MetricCard = ({ metric }: MetricCardProps) => {
  const trendClass = metric.trendType === 'up' ? 'text-[var(--color-accent)]' : 'text-[var(--color-danger)]';
  const IconComponent = metric.icon;
  const operationalLabel = metric.id === 'metric-02'
    ? 'Комплаенс'
    : metric.id === 'metric-03'
      ? 'Поручения'
      : metric.id === 'metric-04'
        ? 'SLA-контроль'
        : 'Поток клиентов';

  const card = (
    <article className="crm-kpi-card rounded-xl border border-[var(--color-border)] bg-[var(--color-kpi-surface)] p-[var(--density-panel-padding)] shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="crm-kpi-icon flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-muted-surface)] text-[var(--color-primary)]" aria-hidden="true">
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="space-y-1 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{operationalLabel}</p>
          <span className={`text-xs font-semibold ${trendClass}`}>{metric.trendLabel}</span>
        </div>
      </div>

      <p className="text-2xl leading-none font-semibold text-[var(--color-text-primary)]">{metric.value}</p>
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
