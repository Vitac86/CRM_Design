import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, DownloadIcon, EmptyState, FileIcon, RefreshIcon, SearchInput, SelectFilter } from '../components/ui';
import { cn } from '../components/ui/cn';
import { reports } from '../data/reports';
import type { Report } from '../data/types';

const reportTypeBadgeVariant: Partial<Record<Report['reportType'], 'info' | 'success' | 'neutral' | 'orange'>> = {
  'Ежедневный': 'info',
  'Недельный': 'neutral',
  'Месячный': 'neutral',
  'Квартальный': 'orange',
  'Годовой': 'success',
};

const deliveryResultBadgeVariant: Record<'Доставлено' | 'Не доставлено', 'success' | 'warning'> = {
  'Доставлено': 'success',
  'Не доставлено': 'warning',
};

const deliveryChannelBadgeVariant: Partial<Record<Report['deliveryChannel'], 'purple' | 'info' | 'neutral'>> = {
  'Личный кабинет': 'purple',
  'Почта': 'info',
  'E-mail': 'neutral',
};

const DetailField = ({ label, value }: { label: string; value?: string }) => (
  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
    <p className="text-xs text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-medium text-slate-800">{value && value.trim().length > 0 ? value : '—'}</p>
  </div>
);

export const DepositoryPage = () => {
  const [search, setSearch] = useState('');
  const [clientCodeFilter, setClientCodeFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState<Report['reportType'] | 'all'>('all');
  const [deliveryChannelFilter, setDeliveryChannelFilter] = useState<Report['deliveryChannel'] | 'all'>('all');
  const [deliveryResultFilter, setDeliveryResultFilter] = useState<'Доставлено' | 'Не доставлено' | 'all'>('all');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deliveryResultOverrides, setDeliveryResultOverrides] = useState<Record<string, 'Доставлено' | 'Не доставлено'>>({});

  const depositoryReports = useMemo(() => reports.filter((report) => report.department === 'Депозитарий'), []);

  const filteredReports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const normalizedClientCodeFilter = clientCodeFilter.trim().toLowerCase();

    return depositoryReports.filter((report) => {
      const reportDate = report.sentAt.slice(0, 10);
      const reportDeliveryResult = deliveryResultOverrides[report.id] ?? report.deliveryResult ?? 'Не доставлено';

      if (normalizedSearch.length > 0) {
        const hasSearchHit =
          report.clientCode.toLowerCase().includes(normalizedSearch) ||
          report.fileName.toLowerCase().includes(normalizedSearch) ||
          report.reportTitle.toLowerCase().includes(normalizedSearch);

        if (!hasSearchHit) {
          return false;
        }
      }

      if (normalizedClientCodeFilter.length > 0 && !report.clientCode.toLowerCase().includes(normalizedClientCodeFilter)) {
        return false;
      }

      if (dateFromFilter && reportDate < dateFromFilter) {
        return false;
      }

      if (dateToFilter && reportDate > dateToFilter) {
        return false;
      }

      if (reportTypeFilter !== 'all' && report.reportType !== reportTypeFilter) {
        return false;
      }

      if (deliveryChannelFilter !== 'all' && report.deliveryChannel !== deliveryChannelFilter) {
        return false;
      }

      if (deliveryResultFilter !== 'all' && reportDeliveryResult !== deliveryResultFilter) {
        return false;
      }

      return true;
    });
  }, [
    clientCodeFilter,
    dateFromFilter,
    dateToFilter,
    deliveryChannelFilter,
    deliveryResultFilter,
    deliveryResultOverrides,
    depositoryReports,
    reportTypeFilter,
    search,
  ]);

  useEffect(() => {
    if (filteredReports.length === 0) {
      setSelectedReportId(null);
      return;
    }

    const hasSelectedReport = filteredReports.some((report) => report.id === selectedReportId);
    if (!hasSelectedReport) {
      setSelectedReportId(filteredReports[0].id);
    }
  }, [filteredReports, selectedReportId]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setToastMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const selectedReport = filteredReports.find((report) => report.id === selectedReportId) ?? null;
  const selectedReportResult = selectedReport ? deliveryResultOverrides[selectedReport.id] ?? selectedReport.deliveryResult ?? 'Не доставлено' : null;

  const resetFilters = () => {
    setSearch('');
    setClientCodeFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setReportTypeFilter('all');
    setDeliveryChannelFilter('all');
    setDeliveryResultFilter('all');
  };

  const handleResend = () => {
    if (!selectedReport) {
      return;
    }

    setDeliveryResultOverrides((current) => ({
      ...current,
      [selectedReport.id]: 'Доставлено',
    }));
    setToastMessage(`Отчёт "${selectedReport.fileName}" отправлен повторно`);
  };

  const handleDownload = () => {
    if (!selectedReport) {
      return;
    }

    setToastMessage(`Файл "${selectedReport.fileName}" подготовлен к скачиванию`);
  };

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Отчёты депозитария</h1>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск по коду клиента, имени файла или отчёту"
          aria-label="Поиск по отчётам депозитария"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            value={clientCodeFilter}
            onChange={(event) => setClientCodeFilter(event.target.value)}
            placeholder="Код клиента"
            className="h-10 w-[190px] rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-light focus:ring-2 focus:ring-brand-light/30"
            aria-label="Фильтр по коду клиента"
          />
          <input
            type="date"
            value={dateFromFilter}
            onChange={(event) => setDateFromFilter(event.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-light focus:ring-2 focus:ring-brand-light/30"
            aria-label="Дата с"
            title="Дата с"
          />
          <input
            type="date"
            value={dateToFilter}
            onChange={(event) => setDateToFilter(event.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-light focus:ring-2 focus:ring-brand-light/30"
            aria-label="Дата по"
            title="Дата по"
          />
          <SelectFilter value={reportTypeFilter} onChange={(event) => setReportTypeFilter(event.target.value as Report['reportType'] | 'all')}>
            <option value="all">Вид отчёта</option>
            <option value="Ежедневный">Ежедневный</option>
            <option value="Недельный">Недельный</option>
            <option value="Месячный">Месячный</option>
            <option value="Квартальный">Квартальный</option>
            <option value="Годовой">Годовой</option>
          </SelectFilter>
          <SelectFilter
            value={deliveryChannelFilter}
            onChange={(event) => setDeliveryChannelFilter(event.target.value as Report['deliveryChannel'] | 'all')}
          >
            <option value="all">Канал отправки</option>
            <option value="Личный кабинет">Личный кабинет</option>
            <option value="Почта">Почта</option>
            <option value="E-mail">E-mail</option>
          </SelectFilter>
          <SelectFilter
            value={deliveryResultFilter}
            onChange={(event) => setDeliveryResultFilter(event.target.value as 'Доставлено' | 'Не доставлено' | 'all')}
          >
            <option value="all">Результат доставки</option>
            <option value="Доставлено">Доставлено</option>
            <option value="Не доставлено">Не доставлено</option>
          </SelectFilter>
          <Button variant="secondary" className="ml-auto" onClick={resetFilters}>
            Очистить фильтры
          </Button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <div className="max-h-[620px] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3">
          {filteredReports.length === 0 ? (
            <EmptyState title="Отчёты не найдены" description="Измените параметры поиска или фильтров." className="h-[460px]" />
          ) : (
            filteredReports.map((report) => {
              const deliveryResult = deliveryResultOverrides[report.id] ?? report.deliveryResult ?? 'Не доставлено';
              const isSelected = report.id === selectedReportId;

              return (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setSelectedReportId(report.id)}
                  className={cn(
                    'w-full rounded-xl border px-3 py-2.5 text-left transition',
                    isSelected
                      ? 'border-brand-light bg-brand-light/5 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-brand-light/50 hover:bg-slate-50',
                  )}
                >
                  <p className="truncate text-sm font-semibold text-slate-900">{report.fileName}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{report.reportType}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span>{report.clientCode}</span>
                    <span>{report.sentAt}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge className="px-1.5 py-0 leading-4" variant={deliveryChannelBadgeVariant[report.deliveryChannel] ?? 'neutral'}>
                      {report.deliveryChannel}
                    </Badge>
                    <Badge className="px-1.5 py-0 leading-4" variant={reportTypeBadgeVariant[report.reportType] ?? 'neutral'}>
                      {report.reportType}
                    </Badge>
                    <Badge className="px-1.5 py-0 leading-4" variant={deliveryResultBadgeVariant[deliveryResult]}>
                      {deliveryResult}
                    </Badge>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 xl:sticky xl:top-4">
          {!selectedReport ? (
            <EmptyState title="Отчёты не найдены" description="Для текущих параметров поиска и фильтров нет доступных отчётов." className="h-[460px]" />
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">{selectedReport.reportTitle || selectedReport.fileName}</h2>

              <div className="grid gap-2 sm:grid-cols-2">
                <DetailField label="Клиент" value={selectedReport.clientName} />
                <DetailField label="Код клиента" value={selectedReport.clientCode} />
                <DetailField label="Вид отчёта" value={selectedReport.reportType} />
                <DetailField label="Период" value={selectedReport.period} />
                <DetailField label="Способ отправки" value={selectedReport.deliveryChannel} />
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">Статус / результат доставки</p>
                  <Badge className="mt-1" variant={deliveryResultBadgeVariant[selectedReportResult ?? 'Не доставлено']}>
                    {selectedReportResult ?? '—'}
                  </Badge>
                </div>
                <DetailField label="Время отправки" value={selectedReport.sentAt} />
                <DetailField label="Адрес" value={selectedReport.address} />
                <DetailField label="Договор" value={selectedReport.contractNumber} />
                <DetailField label="Сформировал" value={selectedReport.createdBy} />
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-slate-100 p-2 text-slate-500" aria-hidden="true">
                    <FileIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{selectedReport.fileName}</p>
                    <p className="text-xs text-slate-500">{selectedReport.fileSize || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={handleResend}>
                  <RefreshIcon className="h-4 w-4" />
                  Отправить повторно
                </Button>
                <Button onClick={handleDownload}>
                  <DownloadIcon className="h-4 w-4" />
                  Скачать
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {toastMessage && (
        <div className="fixed right-6 bottom-6 z-50 rounded-md bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">{toastMessage}</div>
      )}
    </div>
  );
};
