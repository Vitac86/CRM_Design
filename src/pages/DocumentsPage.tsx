import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, DataTable, FilterBar, Pagination, SearchInput, SelectFilter } from '../components/ui';
import { documents } from '../data/documents';
import type { Document } from '../data/types';

const pageSize = 10;

const statusBadgeVariant: Record<Document['status'], 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  'Действующий': 'success',
  'Не действующий': 'neutral',
  'Отклонена': 'danger',
  'На подписи': 'info',
  'На проверке': 'warning',
};

const kindBadgeVariant: Record<string, 'purple' | 'orange' | 'info' | 'warning' | 'neutral'> = {
  'Договор ДУ': 'purple',
  'Договор БО': 'orange',
  'Депозитарный': 'info',
  'Доверенность': 'warning',
  'Дилерский': 'neutral',
};

export const DocumentsPage = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Document['status'] | 'all'>('all');
  const [kindFilter, setKindFilter] = useState<string | 'all'>('all');
  const [page, setPage] = useState(1);

  const statusOptions = useMemo(
    () => [...new Set(documents.map((document) => document.status))],
    [],
  );

  const kindOptions = useMemo(
    () => [...new Set(documents.map((document) => document.kind))],
    [],
  );

  const filteredDocuments = useMemo(
    () =>
      documents.filter((document) => {
        if (search.trim().length > 0 && !document.title.toLowerCase().includes(search.trim().toLowerCase())) {
          return false;
        }

        if (statusFilter !== 'all' && document.status !== statusFilter) {
          return false;
        }

        if (kindFilter !== 'all' && document.kind !== kindFilter) {
          return false;
        }

        return true;
      }),
    [search, statusFilter, kindFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / pageSize));

  const paginatedDocuments = useMemo(
    () => filteredDocuments.slice((page - 1) * pageSize, page * pageSize),
    [filteredDocuments, page],
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages]);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setKindFilter('all');
    setPage(1);
  };

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Документы</h1>
      </header>

      <FilterBar>
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="По названию"
          className="w-[280px]"
          aria-label="Поиск по названию"
        />

        <SelectFilter value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as Document['status'] | 'all')}>
          <option value="all">Статус</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </SelectFilter>

        <SelectFilter value={kindFilter} onChange={(event) => setKindFilter(event.target.value as string | 'all')}>
          <option value="all">Вид документа</option>
          {kindOptions.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </SelectFilter>

        <Button variant="secondary" className="ml-auto" onClick={resetFilters}>
          Очистить фильтры
        </Button>
      </FilterBar>

      <DataTable<Document>
        columns={[
          { key: 'title', header: 'Название документа', className: 'font-medium text-slate-800' },
          {
            key: 'kind',
            header: 'Вид',
            render: (document) => <Badge variant={kindBadgeVariant[document.kind] ?? 'neutral'}>{document.kind}</Badge>,
          },
          {
            key: 'status',
            header: 'Статус',
            render: (document) => <Badge variant={statusBadgeVariant[document.status]}>{document.status}</Badge>,
          },
          { key: 'date', header: 'Дата', className: 'whitespace-nowrap' },
        ]}
        rows={paginatedDocuments}
        emptyMessage="По выбранным фильтрам документов нет"
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
