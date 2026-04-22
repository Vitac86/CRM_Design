import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, DataTable, FilterBar, Pagination, SelectFilter } from '../ui';
import { reports } from '../../data/reports';
import type { Report } from '../../data/types';

const pageSize = 10;

const reportTypeBadgeVariant: Record<Report['reportType'], 'info' | 'success' | 'neutral' | 'orange'> = {
  'Ежедневный': 'info',
  'Годовой': 'success',
  'Месячный': 'neutral',
  'Квартальный': 'orange',
  'Недельный': 'info',
};

const deliveryChannelBadgeVariant: Record<Report['deliveryChannel'], 'purple' | 'info'> = {
  'Личный кабинет': 'purple',
  'Почта': 'info',
};

const deliveryResultBadgeVariant: Record<Report['deliveryResult'], 'success' | 'warning'> = {
  'Доставлено': 'success',
  'Не доставлено': 'warning',
};

type ReportsPageTemplateProps = {
  title: string;
  department: Report['department'];
};

export const ReportsPageTemplate = ({ title, department }: ReportsPageTemplateProps) => {
  const [clientCodeFilter, setClientCodeFilter] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState<Report['reportType'] | 'all'>('all');
  const [deliveryChannelFilter, setDeliveryChannelFilter] = useState<Report['deliveryChannel'] | 'all'>('all');
  const [deliveryResultFilter, setDeliveryResultFilter] = useState<Report['deliveryResult'] | 'all'>('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [page, setPage] = useState(1);

  const departmentReports = useMemo(
    () => reports.filter((report) => report.department === department),
    [department],
  );

  const filteredReports = useMemo(() => {
    return departmentReports.filter((report) => {
      const normalizedClientCodeFilter = clientCodeFilter.trim().toLowerCase();
      const reportDate = report.sentAt.slice(0, 10);

      if (normalizedClientCodeFilter.length > 0 && !report.clientCode.toLowerCase().includes(normalizedClientCodeFilter)) {
        return false;
      }

      if (reportTypeFilter !== 'all' && report.reportType !== reportTypeFilter) {
        return false;
      }

      if (deliveryChannelFilter !== 'all' && report.deliveryChannel !== deliveryChannelFilter) {
        return false;
      }

      if (deliveryResultFilter !== 'all' && report.deliveryResult !== deliveryResultFilter) {
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
  }, [clientCodeFilter, dateFromFilter, dateToFilter, deliveryChannelFilter, deliveryResultFilter, departmentReports, reportTypeFilter]);

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
    setClientCodeFilter('');
    setReportTypeFilter('all');
    setDeliveryChannelFilter('all');
    setDeliveryResultFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
    setPage(1);
  };

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      </header>

      <FilterBar>
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
          onChange={(event) => setDeliveryResultFilter(event.target.value as Report['deliveryResult'] | 'all')}
        >
          <option value="all">Результат доставки</option>
          <option value="Доставлено">Доставлено</option>
          <option value="Не доставлено">Не доставлено</option>
        </SelectFilter>

        <Button variant="secondary" className="ml-auto" onClick={resetFilters}>
          Очистить фильтры
        </Button>
      </FilterBar>

      <DataTable<Report>
        columns={[
          { key: 'fileName', header: 'Имя файла', className: 'font-medium text-slate-800 whitespace-nowrap' },
          { key: 'sentAt', header: 'Дата и время отправки', className: 'whitespace-nowrap' },
          {
            key: 'reportType',
            header: 'Вид отчёта',
            render: (report) => (
              <Badge variant={reportTypeBadgeVariant[report.reportType]}>{report.reportType}</Badge>
            ),
          },
          {
            key: 'deliveryChannel',
            header: 'Канал отправки',
            render: (report) => (
              <Badge variant={deliveryChannelBadgeVariant[report.deliveryChannel]}>{report.deliveryChannel}</Badge>
            ),
          },
          {
            key: 'deliveryResult',
            header: 'Результат доставки',
            render: (report) => (
              <Badge variant={deliveryResultBadgeVariant[report.deliveryResult]}>{report.deliveryResult}</Badge>
            ),
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
    </div>
  );
};
