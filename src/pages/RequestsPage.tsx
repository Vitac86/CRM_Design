import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, DataTable, FilterBar, SearchInput, SelectFilter, Pagination } from '../components/ui';
import { requests } from '../data/requests';
import type { Request } from '../data/types';

const pageSize = 10;

const requestStatusBadgeVariant: Record<Request['status'], 'warning' | 'info' | 'danger'> = {
  'Ожидает': 'warning',
  'Принято': 'info',
  'Отклонено': 'danger',
};

export const RequestsPage = () => {
  const [search, setSearch] = useState('');
  const [clientCodeFilter, setClientCodeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState<Request['source'] | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<Request['status'] | 'all'>('all');
  const [page, setPage] = useState(1);

  const sourceOptions = useMemo(
    () => [...new Set(requests.map((request) => request.source))],
    [],
  );

  const statusOptions = useMemo(
    () => [...new Set(requests.map((request) => request.status))],
    [],
  );

  const filteredRequests = useMemo(
    () =>
      requests.filter((request) => {
        const normalizedSearch = search.trim().toLowerCase();

        if (
          normalizedSearch.length > 0
          && !request.number.toLowerCase().includes(normalizedSearch)
          && !request.requestType.toLowerCase().includes(normalizedSearch)
          && !request.clientName.toLowerCase().includes(normalizedSearch)
          && !request.clientCode.toLowerCase().includes(normalizedSearch)
        ) {
          return false;
        }

        const normalizedClientCode = clientCodeFilter.trim().toLowerCase();
        if (normalizedClientCode.length > 0 && !request.clientCode.toLowerCase().includes(normalizedClientCode)) {
          return false;
        }

        if (dateFilter && request.date !== dateFilter) {
          return false;
        }

        if (sourceFilter !== 'all' && request.source !== sourceFilter) {
          return false;
        }

        if (statusFilter !== 'all' && request.status !== statusFilter) {
          return false;
        }

        return true;
      }),
    [search, clientCodeFilter, dateFilter, sourceFilter, statusFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));

  const paginatedRequests = useMemo(
    () => filteredRequests.slice((page - 1) * pageSize, page * pageSize),
    [filteredRequests, page],
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages]);

  const resetFilters = () => {
    setSearch('');
    setClientCodeFilter('');
    setDateFilter('');
    setSourceFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Заявки</h1>
      </header>

      <FilterBar className="flex-col items-stretch gap-3">
        <div className="flex w-full flex-wrap gap-3">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="По номеру, виду заявки, клиенту или коду"
            className="w-full md:w-[520px]"
            aria-label="Поиск по номеру, виду заявки, клиенту или коду"
          />
        </div>

        <div className="flex w-full flex-wrap items-end gap-3">
          <input
            type="text"
            value={clientCodeFilter}
            onChange={(event) => setClientCodeFilter(event.target.value)}
            placeholder="По коду клиента"
            aria-label="Фильтр по коду клиента"
            className="h-10 min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition hover:border-slate-300 focus:border-brand focus:ring-2 focus:ring-brand/10"
          />

          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            aria-label="Фильтр по дате"
            className="h-10 min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-brand focus:ring-2 focus:ring-brand/10"
          />

          <SelectFilter value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as Request['source'] | 'all')}>
            <option value="all">Источник</option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </SelectFilter>

          <SelectFilter value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as Request['status'] | 'all')}>
            <option value="all">Статус</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </SelectFilter>

          <Button variant="secondary" className="ml-auto" onClick={resetFilters}>
            Очистить фильтры
          </Button>
        </div>
      </FilterBar>

      <DataTable<Request>
        columns={[
          { key: 'number', header: 'Номер заявки', className: 'font-medium text-slate-800 whitespace-nowrap' },
          { key: 'requestType', header: 'Вид заявки', className: 'min-w-[220px]' },
          { key: 'clientName', header: 'Клиент', className: 'min-w-[260px]' },
          { key: 'clientCode', header: 'Код клиента', className: 'whitespace-nowrap' },
          {
            key: 'status',
            header: 'Статус',
            render: (request) => (
              <Badge variant={requestStatusBadgeVariant[request.status]}>{request.status}</Badge>
            ),
          },
          { key: 'date', header: 'Дата', className: 'whitespace-nowrap' },
          { key: 'time', header: 'Время', className: 'whitespace-nowrap' },
          { key: 'source', header: 'Источник' },
        ]}
        rows={paginatedRequests}
        emptyMessage="По выбранным фильтрам заявок нет"
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
