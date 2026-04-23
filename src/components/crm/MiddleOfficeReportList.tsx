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
    <div className="max-h-[560px] space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2.5">
      {reports.map((report) => {
        const isActive = report.id === selectedReportId;

        return (
          <button
            type="button"
            key={report.id}
            onClick={() => onSelect(report.id)}
            className={cn(
              'w-full rounded-lg border px-2.5 py-2 text-left transition',
              isActive
                ? 'border-emerald-200 bg-emerald-50/70 shadow-sm'
                : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/30',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 gap-2.5">
                <span className={cn('mt-0.5 text-sm', statusIconStyleMap[report.deliveryStatus])} aria-hidden="true">
                  {statusIconMap[report.deliveryStatus]}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{report.clientName}</p>
                  <p className="mt-0.5 text-xs text-slate-700">{report.reportTitle}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge className="px-1.5 py-0 leading-4" variant="info">
                      {report.deliveryChannel}
                    </Badge>
                    <Badge className="px-1.5 py-0 leading-4" variant="neutral">
                      {report.reportType}
                    </Badge>
                    <Badge className="px-1.5 py-0 leading-4" variant={statusBadgeVariantMap[report.deliveryStatus]}>
                      {report.deliveryStatus}
                    </Badge>
                  </div>
                </div>
              </div>
              <span className="shrink-0 pt-0.5 text-[11px] leading-4 text-slate-500">{report.sentAt}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
