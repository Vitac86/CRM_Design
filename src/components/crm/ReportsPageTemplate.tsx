import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { PageShell } from '../layout/PageShell';
import { PageToolbar } from '../layout/PageToolbar';
import { Badge, Button, DataTable, FilterBar, Pagination, SearchInput, SelectFilter } from '../ui';
import type { Report } from '../../data/types';

const pageSize = 10;

const reportTypeBadgeVariant: Partial<Record<Report['reportType'], 'info' | 'success' | 'neutral' | 'orange'>> = {
  'Ежедневный': 'info',
  'Годовой': 'success',
  'Месячный': 'neutral',
  'Квартальный': 'orange',
  'Недельный': 'info',
};

const deliveryChannelBadgeVariant: Partial<Record<Report['deliveryChannel'], 'purple' | 'info'>> = {
  'Личный кабинет': 'purple',
  'Почта': 'info',
};

const deliveryResultBadgeVariant: Record<'Доставлено' | 'Не доставлено', 'success' | 'warning'> = {
  'Доставлено': 'success',
  'Не доставлено': 'warning',
};

type ReportsPageTemplateProps = {
  title: string;
  reports: Report[];
  separateSearchRow?: boolean;
  searchPlaceholder?: string;
};

export const ReportsPageTemplate = ({
  title,
  reports,
  separateSearchRow = false,
  searchPlaceholder = 'Поиск по коду клиента, имени файла или отчёту',
}: ReportsPageTemplateProps) => {
  const [search, setSearch] = useState('');
  const [clientCodeFilter, setClientCodeFilter] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState<Report['reportType'] | 'all'>('all');
  const [deliveryChannelFilter, setDeliveryChannelFilter] = useState<Report['deliveryChannel'] | 'all'>('all');
  const [deliveryResultFilter, setDeliveryResultFilter] = useState<'Доставлено' | 'Не доставлено' | 'all'>('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [page, setPage] = useState(1);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const normalizedSearch = search.trim().toLowerCase();
      const normalizedClientCodeFilter = clientCodeFilter.trim().toLowerCase();
      const reportDate = report.sentAt.slice(0, 10);

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

      if (reportTypeFilter !== 'all' && report.reportType !== reportTypeFilter) {
        return false;
      }

      if (deliveryChannelFilter !== 'all' && report.deliveryChannel !== deliveryChannelFilter) {
        return false;
      }

      if (deliveryResultFilter !== 'all' && (report.deliveryResult ?? 'Не доставлено') !== deliveryResultFilter) {
        return false;
      }

      if (dateFromFilter && reportDate < dateFromFilter) {
        return false;
      }

      if (dateToFilter && reportDate > dateToFilter) {
        return false;
      }

      return true;
    });
  }, [clientCodeFilter, dateFromFilter, dateToFilter, deliveryChannelFilter, deliveryResultFilter, reportTypeFilter, reports, search]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));

  const paginatedReports = useMemo(
    () => filteredReports.slice((page - 1) * pageSize, page * pageSize),
    [filteredReports, page],
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages]);

  const resetFilters = () => {
    setSearch('');
    setClientCodeFilter('');
    setReportTypeFilter('all');
    setDeliveryChannelFilter('all');
    setDeliveryResultFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
    setPage(1);
  };

  return (
    <PageShell>
      <PageHeader title={title} />

      {separateSearchRow ? (
        <section className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Поиск по отчётам депозитария"
          />

          <FilterBar className="rounded-xl border-none bg-transparent p-0 shadow-none">
            <input
              value={clientCodeFilter}
              onChange={(event) => setClientCodeFilter(event.target.value)}
              placeholder="Код клиента"
              className="h-10 w-full sm:w-[190px] max-w-full rounded-md border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 text-sm text-[var(--color-input-text)] shadow-sm outline-none transition hover:border-[var(--color-primary)]/40 focus:border-[var(--color-input-focus)] focus:ring-2 focus:ring-[var(--color-input-focus)]/20"
              aria-label="Фильтр по коду клиента"
            />

            <input
              type="date"
              value={dateFromFilter}
              onChange={(event) => setDateFromFilter(event.target.value)}
              className="h-10 rounded-md border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 text-sm text-[var(--color-input-text)] shadow-sm outline-none transition hover:border-[var(--color-primary)]/40 focus:border-[var(--color-input-focus)] focus:ring-2 focus:ring-[var(--color-input-focus)]/20"
              aria-label="Дата с"
              title="Дата с"
            />

            <input
              type="date"
              value={dateToFilter}
              onChange={(event) => setDateToFilter(event.target.value)}
              className="h-10 rounded-md border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 text-sm text-[var(--color-input-text)] shadow-sm outline-none transition hover:border-[var(--color-primary)]/40 focus:border-[var(--color-input-focus)] focus:ring-2 focus:ring-[var(--color-input-focus)]/20"
              aria-label="Дата по"
              title="Дата по"
            />

            <SelectFilter
              value={reportTypeFilter}
              onChange={(event) => setReportTypeFilter(event.target.value as Report['reportType'] | 'all')}
            >
              <option value="all">Вид отчёта</option>
              <option value="Ежедневный">Ежедневный</option>
              <option value="Годовой">Годовой</option>
              <option value="Месячный">Месячный</option>
              <option value="Квартальный">Квартальный</option>
              <option value="Недельный">Недельный</option>
            </SelectFilter>

            <SelectFilter
              value={deliveryChannelFilter}
              onChange={(event) => setDeliveryChannelFilter(event.target.value as Report['deliveryChannel'] | 'all')}
            >
              <option value="all">Канал отправки</option>
              <option value="Личный кабинет">Личный кабинет</option>
              <option value="Почта">Почта</option>
            </SelectFilter>

            <SelectFilter
              value={deliveryResultFilter}
              onChange={(event) => setDeliveryResultFilter(event.target.value as 'Доставлено' | 'Не доставлено' | 'all')}
            >
              <option value="all">Результат доставки</option>
              <option value="Доставлено">Доставлено</option>
              <option value="Не доставлено">Не доставлено</option>
            </SelectFilter>

            <Button variant="secondary" className="sm:ml-auto" onClick={resetFilters}>
              Очистить фильтры
            </Button>
          </FilterBar>
        </section>
      ) : (
        <PageToolbar
          search={
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по клиенту, файлу или отчёту"
              className="h-10 w-full sm:w-[300px] max-w-full rounded-md border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 text-sm text-[var(--color-input-text)] shadow-sm outline-none transition hover:border-[var(--color-primary)]/40 focus:border-[var(--color-input-focus)] focus:ring-2 focus:ring-[var(--color-input-focus)]/20"
              aria-label="Поиск по отчётам"
            />
          }
          filters={
            <>
          <input
            value={clientCodeFilter}
            onChange={(event) => setClientCodeFilter(event.target.value)}
            placeholder="Код клиента"
            className="h-10 w-full sm:w-[190px] max-w-full rounded-md border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 text-sm text-[var(--color-input-text)] shadow-sm outline-none transition hover:border-[var(--color-primary)]/40 focus:border-[var(--color-input-focus)] focus:ring-2 focus:ring-[var(--color-input-focus)]/20"
            aria-label="Фильтр по коду клиента"
          />

          <input
            type="date"
            value={dateFromFilter}
            onChange={(event) => setDateFromFilter(event.target.value)}
            className="h-10 rounded-md border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 text-sm text-[var(--color-input-text)] shadow-sm outline-none transition hover:border-[var(--color-primary)]/40 focus:border-[var(--color-input-focus)] focus:ring-2 focus:ring-[var(--color-input-focus)]/20"
            aria-label="Дата с"
            title="Дата с"
          />

          <input
            type="date"
            value={dateToFilter}
            onChange={(event) => setDateToFilter(event.target.value)}
            className="h-10 rounded-md border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 text-sm text-[var(--color-input-text)] shadow-sm outline-none transition hover:border-[var(--color-primary)]/40 focus:border-[var(--color-input-focus)] focus:ring-2 focus:ring-[var(--color-input-focus)]/20"
            aria-label="Дата по"
            title="Дата по"
          />

          <SelectFilter
            value={reportTypeFilter}
            onChange={(event) => setReportTypeFilter(event.target.value as Report['reportType'] | 'all')}
          >
            <option value="all">Вид отчёта</option>
            <option value="Ежедневный">Ежедневный</option>
            <option value="Годовой">Годовой</option>
            <option value="Месячный">Месячный</option>
            <option value="Квартальный">Квартальный</option>
            <option value="Недельный">Недельный</option>
          </SelectFilter>

          <SelectFilter
            value={deliveryChannelFilter}
            onChange={(event) => setDeliveryChannelFilter(event.target.value as Report['deliveryChannel'] | 'all')}
          >
            <option value="all">Канал отправки</option>
            <option value="Личный кабинет">Личный кабинет</option>
            <option value="Почта">Почта</option>
          </SelectFilter>

          <SelectFilter
            value={deliveryResultFilter}
            onChange={(event) => setDeliveryResultFilter(event.target.value as 'Доставлено' | 'Не доставлено' | 'all')}
          >
            <option value="all">Результат доставки</option>
            <option value="Доставлено">Доставлено</option>
            <option value="Не доставлено">Не доставлено</option>
          </SelectFilter>

            </>
          }
          actions={(
            <Button variant="secondary" onClick={resetFilters}>
              Очистить фильтры
            </Button>
          )}
        />
      )}

      <DataTable<Report>
        columns={[
          { key: 'fileName', header: 'Имя файла', className: 'font-medium text-[var(--color-text-primary)] whitespace-nowrap' },
          { key: 'sentAt', header: 'Дата и время отправки', className: 'whitespace-nowrap' },
          {
            key: 'reportType',
            header: 'Вид отчёта',
            render: (report) => (
              <Badge variant={reportTypeBadgeVariant[report.reportType] ?? 'neutral'}>{report.reportType}</Badge>
            ),
          },
          {
            key: 'deliveryChannel',
            header: 'Канал отправки',
            render: (report) => (
              <Badge variant={deliveryChannelBadgeVariant[report.deliveryChannel] ?? 'neutral'}>{report.deliveryChannel}</Badge>
            ),
          },
          {
            key: 'deliveryResult',
            header: 'Результат доставки',
            render: (report) => {
              const result = report.deliveryResult ?? 'Не доставлено';

              return <Badge variant={deliveryResultBadgeVariant[result]}>{result}</Badge>;
            },
          },
        ]}
        rows={paginatedReports}
        emptyMessage="По выбранным фильтрам отчётов нет"
      />

      <div className="flex justify-end">
        <Pagination
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
          onNext={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
        />
      </div>
    </PageShell>
  );
};
