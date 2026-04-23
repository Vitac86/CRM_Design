import { Link } from 'react-router-dom';
import { DashboardTable } from '../components/crm/DashboardTable';
import { MetricCard } from '../components/crm/MetricCard';
import { TableStatusText } from '../components/ui';
import { dashboardMetrics, subjectChanges } from '../data/dashboard';
import { getLatestRequests } from '../data/requests';

const requestStatusTone: Record<string, 'neutral' | 'warning' | 'danger'> = {
  Ожидает: 'warning',
  Принято: 'neutral',
  Отклонено: 'danger',
};

export const DashboardPage = () => {
  const subjectRows = subjectChanges.map((item) => [item.subject, item.change]);

  const requestRows = getLatestRequests().map((item) => [
    item.number,
    item.status,
    new Date(item.date).toLocaleDateString('ru-RU'),
  ]);

  return (
    <div className="space-y-6 rounded-2xl bg-slate-100/80 p-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Операционный обзор</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardMetrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <DashboardTable
          title="Последние изменения по субъектам"
          columns={['Субъект', 'Изменения']}
          rows={subjectRows}
        />

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Последние поручения</h2>
            <Link to="/requests" className="text-sm font-medium text-brand transition hover:text-brand-hover">
              Все поручения
            </Link>
          </header>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-brand-light/70 text-left text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Номер поручения</th>
                  <th className="px-4 py-2.5 font-semibold">Статус</th>
                  <th className="px-4 py-2.5 font-semibold">Дата</th>
                </tr>
              </thead>
              <tbody>
                {requestRows.map(([requestNumber, status, date], rowIndex) => (
                  <tr key={`request-${rowIndex}`} className="border-t border-slate-100 align-top text-slate-700">
                    <td className="px-4 py-3 font-medium text-slate-800">{requestNumber}</td>
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
