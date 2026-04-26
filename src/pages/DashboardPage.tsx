import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDataAccess } from '../app/dataAccess/useDataAccess';
import { DashboardTable } from '../components/crm/DashboardTable';
import { MetricCard } from '../components/crm/MetricCard';
import { TableStatusText } from '../components/ui';
import type { DashboardMetric, SubjectChange } from '../data/dashboard';
import type { Request } from '../data/types';

const requestStatusTone: Record<string, 'neutral' | 'warning' | 'danger'> = {
  Ожидает: 'warning',
  Принято: 'neutral',
  Отклонено: 'danger',
};

const DASHBOARD_LATEST_REQUESTS_LIMIT = 10;

export const DashboardPage = () => {
  const { dashboard: dashboardDataAccess, requests: requestsDataAccess } = useDataAccess();
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [subjectChanges, setSubjectChanges] = useState<SubjectChange[]>([]);
  const [latestRequests, setLatestRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadDashboardData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [loadedMetrics, loadedSubjectChanges, loadedRequests] = await Promise.all([
          dashboardDataAccess.listDashboardMetrics(),
          dashboardDataAccess.listSubjectChanges(),
          requestsDataAccess.listRequests(),
        ]);

        if (isCancelled) {
          return;
        }

        const latest = [...loadedRequests]
          .sort((left, right) => {
            const leftDateTime = new Date(`${left.date}T${left.time}:00`).getTime();
            const rightDateTime = new Date(`${right.date}T${right.time}:00`).getTime();
            return rightDateTime - leftDateTime;
          })
          .slice(0, DASHBOARD_LATEST_REQUESTS_LIMIT);

        setMetrics(loadedMetrics);
        setSubjectChanges(loadedSubjectChanges);
        setLatestRequests(latest);
      } catch {
        if (!isCancelled) {
          setError('Не удалось загрузить данные операционного обзора.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboardData();

    return () => {
      isCancelled = true;
    };
  }, [dashboardDataAccess, requestsDataAccess]);

  const subjectRows = useMemo(
    () => subjectChanges.map((item) => [item.subject, item.change]),
    [subjectChanges],
  );

  const requestRows = useMemo(
    () =>
      latestRequests.map((item) => [
        item.number,
        item.status,
        new Date(item.date).toLocaleDateString('ru-RU'),
      ]),
    [latestRequests],
  );
  const operationalSnapshot = useMemo(() => {
    const awaiting = latestRequests.filter((request) => request.status === 'Ожидает').length;
    const accepted = latestRequests.filter((request) => request.status === 'Принято').length;
    const rejected = latestRequests.filter((request) => request.status === 'Отклонено').length;
    return { awaiting, accepted, rejected };
  }, [latestRequests]);

  return (
    <div className="crm-prestige-panel crm-dashboard-executive min-w-0 space-y-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Операционный обзор</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section className="crm-executive-summary rounded-xl border border-[var(--color-border)] bg-[var(--color-kpi-surface)] p-[var(--density-panel-padding)] shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Операционный статус смены</h2>
          <span className="rounded border border-[var(--color-border)] bg-[var(--color-table-header)] px-2 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
            Live board
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted-surface)] px-3 py-2.5">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Очередь поручений</p>
            <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">{operationalSnapshot.awaiting}</p>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted-surface)] px-3 py-2.5">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Закрыто сегодня</p>
            <p className="mt-1 text-lg font-semibold text-[var(--color-success)]">{operationalSnapshot.accepted}</p>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted-surface)] px-3 py-2.5">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Требуют эскалации</p>
            <p className="mt-1 text-lg font-semibold text-[var(--color-warning)]">{operationalSnapshot.rejected}</p>
          </div>
        </div>
      </section>

      {error && <p className="text-sm font-medium text-[var(--color-danger)]">{error}</p>}

      {isLoading && (
        <p className="text-sm text-[var(--color-text-secondary)]">Загрузка данных...</p>
      )}

      <section className="grid gap-5 xl:grid-cols-2">
        <DashboardTable
          title="Последние изменения по субъектам"
          columns={['Субъект', 'Изменения']}
          rows={subjectRows}
        />

        <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-kpi-surface)] shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-[var(--density-panel-padding)] py-[var(--density-table-header-y)]">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Последние поручения</h2>
            <Link to="/requests" className="crm-link text-sm font-medium">
              Все поручения
            </Link>
          </header>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-[var(--color-table-header)] text-left text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
                <tr>
                  <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] font-semibold">Номер поручения</th>
                  <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] font-semibold">Статус</th>
                  <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] font-semibold">Дата</th>
                </tr>
              </thead>
              <tbody>
                {requestRows.map(([requestNumber, status, date], rowIndex) => (
                  <tr key={`request-${rowIndex}`} className="border-t border-[var(--color-border)] align-top text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-table-row-hover)]">
                    <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-row-y)] font-medium text-[var(--color-text-primary)]">{requestNumber}</td>
                    <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-row-y)]">
                      <TableStatusText tone={requestStatusTone[status]}>
                        {status}
                      </TableStatusText>
                    </td>
                    <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-row-y)]">{date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  );
};
