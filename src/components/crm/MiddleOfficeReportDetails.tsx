import { Button, DownloadIcon, EmptyState, FileIcon, RefreshIcon, TableStatusText } from '../ui';
import type { Report } from '../../data/types';

const statusToneMap: Record<Report['deliveryStatus'], 'neutral' | 'danger'> = {
  'Доставлен': 'neutral',
  'Ошибка': 'danger',
};

type MiddleOfficeReportDetailsProps = {
  report: Report | null;
  onResend: () => void;
  onDownload: () => void;
};

const DetailField = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted-surface)] px-3 py-2">
    <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
    <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">{value}</p>
  </div>
);

export const MiddleOfficeReportDetails = ({ report, onResend, onDownload }: MiddleOfficeReportDetailsProps) => {
  if (!report) {
    return <EmptyState title="Выберите отчёт" description="Чтобы посмотреть детали, выберите запись слева." className="h-full min-h-[420px]" />;
  }

  return (
    <div className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 lg:sticky lg:top-4">
      <div>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{report.reportTitle}</h2>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <DetailField label="Клиент" value={report.clientName} />
        <DetailField label="Код клиента" value={report.clientCode} />
        <DetailField label="Тип отчёта" value={report.reportType} />
        <DetailField label="Период" value={report.period} />
        <DetailField label="Способ отправки" value={report.deliveryChannel} />
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted-surface)] px-3 py-2">
          <p className="text-xs text-[var(--color-text-secondary)]">Статус</p>
          <TableStatusText tone={statusToneMap[report.deliveryStatus]} className="mt-1 block">
            {report.deliveryStatus}
          </TableStatusText>
        </div>
        <DetailField label="Время отправки" value={report.sentAt} />
        <DetailField label="Адрес" value={report.address} />
        <DetailField label="Договор" value={report.contractNumber} />
        <DetailField label="Сформировал" value={report.createdBy} />
      </div>

      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted-surface)] px-3 py-3">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-[var(--color-surface)] p-2 text-[var(--color-text-secondary)]" aria-hidden="true">
            <FileIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{report.fileName}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{report.fileSize}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onResend}>
          <RefreshIcon className="h-4 w-4" />
          Отправить повторно
        </Button>
        <Button onClick={onDownload}>
          <DownloadIcon className="h-4 w-4" />
          Скачать
        </Button>
      </div>
    </div>
  );
};
