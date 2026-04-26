import { Badge, EmptyState, TableStatusText, getStatusDescriptor } from '../ui';
import type { Report } from '../../data/types';
import { cn } from '../ui/cn';

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
    <div className="max-h-[560px] space-y-1.5 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-2.5">
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
                ? 'border-[var(--color-primary)]/35 bg-[color:color-mix(in_srgb,var(--color-primary)_8%,transparent)] shadow-sm'
                : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/30 hover:bg-[color:color-mix(in_srgb,var(--color-primary)_5%,transparent)]',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{report.clientName}</p>
                <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{report.reportTitle}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge className="px-1.5 py-0 leading-4" variant="neutral">
                    {report.deliveryChannel}
                  </Badge>
                  <Badge className="px-1.5 py-0 leading-4" variant="neutral">
                    {report.reportType}
                  </Badge>
                  <TableStatusText tone={getStatusDescriptor(report.deliveryStatus)?.tone === 'danger' ? 'danger' : 'neutral'} className="text-xs">
                    {report.deliveryStatus}
                  </TableStatusText>
                </div>
              </div>
              <span className="shrink-0 pt-0.5 text-[11px] leading-4 text-[var(--color-text-secondary)]">{report.sentAt}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
