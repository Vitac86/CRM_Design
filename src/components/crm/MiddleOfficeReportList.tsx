import { Badge, EmptyState } from '../ui';
import type { Report } from '../../data/types';
import { cn } from '../ui/cn';

const statusIconMap: Record<Report['deliveryStatus'], string> = {
  'Доставлен': '✓',
  'Ожидает': '⏳',
  'Ошибка': '✕',
};

const statusIconStyleMap: Record<Report['deliveryStatus'], string> = {
  'Доставлен': 'text-emerald-600',
  'Ожидает': 'text-amber-600',
  'Ошибка': 'text-rose-600',
};

const statusBadgeVariantMap: Record<Report['deliveryStatus'], 'success' | 'warning' | 'danger'> = {
  'Доставлен': 'success',
  'Ожидает': 'warning',
  'Ошибка': 'danger',
};

type MiddleOfficeReportListProps = {
  reports: Report[];
  selectedReportId: string | null;
  onSelect: (reportId: string) => void;
};

export const MiddleOfficeReportList = ({ reports, selectedReportId, onSelect }: MiddleOfficeReportListProps) => {
  if (reports.length === 0) {
    return <EmptyState title="Отчёты не найдены" description="Измените параметры поиска или фильтры." className="h-[420px]" />;
  }

  return (
    <div className="max-h-[560px] space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
      {reports.map((report) => {
        const isActive = report.id === selectedReportId;

        return (
          <button
            type="button"
            key={report.id}
            onClick={() => onSelect(report.id)}
            className={cn(
              'w-full rounded-lg border px-3 py-3 text-left transition',
              isActive
                ? 'border-emerald-200 bg-emerald-50/70 shadow-sm'
                : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/30',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <span className={cn('mt-0.5 text-base', statusIconStyleMap[report.deliveryStatus])} aria-hidden="true">
                  {statusIconMap[report.deliveryStatus]}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{report.clientName}</p>
                  <p className="mt-0.5 text-sm text-slate-700">{report.reportTitle}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="info">{report.deliveryChannel}</Badge>
                    <Badge variant="neutral">{report.reportType}</Badge>
                    <Badge variant={statusBadgeVariantMap[report.deliveryStatus]}>{report.deliveryStatus}</Badge>
                  </div>
                </div>
              </div>
              <span className="shrink-0 text-xs text-slate-500">{report.sentAt}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
