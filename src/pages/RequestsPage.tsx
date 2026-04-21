import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, DataTable, FilterBar, Pagination, SearchInput, SelectFilter } from '../components/ui';
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
        ) {
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
    [search, sourceFilter, statusFilter],
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
    setSourceFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Заявки</h1>
      </header>

      <FilterBar>
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="По номеру или виду заявки"
          className="w-[320px]"
          aria-label="Поиск по номеру или виду заявки"
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
      </FilterBar>

      <DataTable<Request>
        columns={[
          { key: 'number', header: 'Номер заявки', className: 'font-medium text-slate-800 whitespace-nowrap' },
          { key: 'requestType', header: 'Вид заявки', className: 'min-w-[260px]' },
          {
            key: 'status',
            header: 'Статус',
            render: (request) => (
              <Badge variant={requestStatusBadgeVariant[request.status]}>{request.status}</Badge>
            ),
          },
          { key: 'date', header: 'Дата', className: 'whitespace-nowrap' },
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
