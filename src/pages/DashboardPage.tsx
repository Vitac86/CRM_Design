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

  return (
    <div className="min-w-0 space-y-6 rounded-2xl bg-[var(--color-muted-surface)]/80 p-4 sm:p-5">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Операционный обзор</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      {error && (
        <p className="text-sm font-medium text-rose-600">{error}</p>
      )}

      {isLoading && (
        <p className="text-sm text-[var(--color-text-secondary)]">Загрузка данных...</p>
      )}

      <section className="grid gap-5 xl:grid-cols-2">
        <DashboardTable
          title="Последние изменения по субъектам"
          columns={['Субъект', 'Изменения']}
          rows={subjectRows}
        />

        <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Последние поручения</h2>
            <Link to="/requests" className="text-sm font-medium text-[var(--color-primary)] transition hover:text-[var(--color-accent)]">
              Все поручения
            </Link>
          </header>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-[var(--color-muted-surface)] text-left text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Номер поручения</th>
                  <th className="px-4 py-2.5 font-semibold">Статус</th>
                  <th className="px-4 py-2.5 font-semibold">Дата</th>
                </tr>
              </thead>
              <tbody>
                {requestRows.map(([requestNumber, status, date], rowIndex) => (
                  <tr key={`request-${rowIndex}`} className="border-t border-[var(--color-border)] align-top text-[var(--color-text-primary)]">
                    <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{requestNumber}</td>
                    <td className="px-4 py-3">
                      <TableStatusText tone={requestStatusTone[status]}>
                        {status}
                      </TableStatusText>
                    </td>
                    <td className="px-4 py-3">{date}</td>
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
