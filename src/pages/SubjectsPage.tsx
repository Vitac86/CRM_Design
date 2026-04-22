import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientsStore } from '../app/ClientsStore';
import type { Client, ClientRole, ClientType, ComplianceStatus, ResidencyStatus } from '../data/types';
import {
  ActiveFilterChip,
  Badge,
  Button,
  DataTable,
  FilterChipSelect,
  PageSizeSelector,
  Pagination,
  SearchInput,
  TableControlPanel,
  type SortDirection,
} from '../components/ui';
import {
  formatClientType,
  formatComplianceStatus,
  formatResidency,
  getClientTypeBadgeVariant,
  getComplianceBadgeVariant,
  getResidencyBadgeVariant,
} from '../utils/labels';

const allRoles: ClientRole[] = ['Клиент', 'Бенефициар', 'Представитель'];
type SubjectsSortKey = 'code' | 'name' | 'inn' | 'type' | 'residency' | 'complianceStatus' | 'fullDocumentSet';

export const SubjectsPage = () => {
  const navigate = useNavigate();
  const { clients } = useClientsStore();

  const [typeFilter, setTypeFilter] = useState<ClientType | 'all'>('all');
  const [residencyFilter, setResidencyFilter] = useState<ResidencyStatus | 'all'>('all');
  const [complianceFilter, setComplianceFilter] = useState<ComplianceStatus | 'all'>('all');
  const [qualificationFilter, setQualificationFilter] = useState<'all' | 'qualified' | 'not-qualified'>('all');
  const [roleFilter, setRoleFilter] = useState<ClientRole | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState<SubjectsSortKey>('code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const typeOptions = useMemo(() => [...new Set(clients.map((client) => client.type))], [clients]);
  const residencyOptions = useMemo(() => [...new Set(clients.map((client) => client.residency))], [clients]);
  const complianceOptions = useMemo(() => [...new Set(clients.map((client) => client.complianceStatus))], [clients]);

  const filteredClients = useMemo(
    () =>
      clients.filter((client) => {
        const normalizedSearch = search.trim().toLowerCase();

        if (
          normalizedSearch &&
          ![client.name, client.code, client.inn, client.email, client.phone].some((value) =>
            value.toLowerCase().includes(normalizedSearch),
          )
        ) {
          return false;
        }

        if (typeFilter !== 'all' && client.type !== typeFilter) {
          return false;
        }

        if (residencyFilter !== 'all' && client.residency !== residencyFilter) {
          return false;
        }

        if (complianceFilter !== 'all' && client.complianceStatus !== complianceFilter) {
          return false;
        }

        if (qualificationFilter === 'qualified' && !client.qualification) {
          return false;
        }

        if (qualificationFilter === 'not-qualified' && client.qualification) {
          return false;
        }

        if (roleFilter !== 'all' && !client.roles.includes(roleFilter)) {
          return false;
        }

        return true;
      }),
    [search, typeFilter, residencyFilter, complianceFilter, qualificationFilter, roleFilter],
  );

  const sortedClients = useMemo(() => {
    const list = [...filteredClients];

    list.sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;

      if (sortKey === 'fullDocumentSet') {
        return (Number(a.fullDocumentSet) - Number(b.fullDocumentSet)) * direction;
      }

      const left = String(a[sortKey]);
      const right = String(b[sortKey]);

      return left.localeCompare(right, 'ru') * direction;
    });

    return list;
  }, [filteredClients, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedClients.length / pageSize));
  const paginatedClients = useMemo(
    () => sortedClients.slice((page - 1) * pageSize, page * pageSize),
    [sortedClients, page, pageSize],
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, residencyFilter, complianceFilter, qualificationFilter, roleFilter]);

  const handleSort = (nextSortKey: string) => {
    if (nextSortKey === sortKey) {
      setSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(nextSortKey as SubjectsSortKey);
      setSortDirection('asc');
    }

    setPage(1);
  };

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setResidencyFilter('all');
    setComplianceFilter('all');
    setQualificationFilter('all');
    setRoleFilter('all');
    setPage(1);
  };

  const hasActiveConditions =
    search.trim().length > 0 ||
    typeFilter !== 'all' ||
    residencyFilter !== 'all' ||
    complianceFilter !== 'all' ||
    qualificationFilter !== 'all' ||
    roleFilter !== 'all';

  const qualificationLabelByValue: Record<'all' | 'qualified' | 'not-qualified', string> = {
    all: 'Все',
    qualified: 'Квалифицированный',
    'not-qualified': 'Неквалифицированный',
  };

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Субъекты</h1>
        <Button className="w-full sm:w-auto" onClick={() => navigate('/subjects/register')}>
          + Добавить
        </Button>
      </header>

      <div>
        <TableControlPanel
          search={
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по клиенту, коду, ИНН или email"
              className="w-full"
            />
          }
          filters={
            <>
              <FilterChipSelect
                label="Тип"
                value={typeFilter}
                displayValue={typeFilter === 'all' ? 'Все' : formatClientType(typeFilter)}
                onChange={(value) => setTypeFilter(value as ClientType | 'all')}
                active={typeFilter !== 'all'}
                options={[{ value: 'all', label: 'Все' }, ...typeOptions.map((type) => ({ value: type, label: formatClientType(type) }))]}
              />

              <FilterChipSelect
                label="Резидентство"
                value={residencyFilter}
                displayValue={residencyFilter === 'all' ? 'Все' : formatResidency(residencyFilter)}
                onChange={(value) => setResidencyFilter(value as ResidencyStatus | 'all')}
                active={residencyFilter !== 'all'}
                options={[
                  { value: 'all', label: 'Все' },
                  ...residencyOptions.map((residency) => ({ value: residency, label: formatResidency(residency) })),
                ]}
              />

              <FilterChipSelect
                label="Комплаенс"
                value={complianceFilter}
                displayValue={complianceFilter === 'all' ? 'Все' : formatComplianceStatus(complianceFilter)}
                onChange={(value) => setComplianceFilter(value as ComplianceStatus | 'all')}
                active={complianceFilter !== 'all'}
                options={[
                  { value: 'all', label: 'Все' },
                  ...complianceOptions.map((status) => ({ value: status, label: formatComplianceStatus(status) })),
                ]}
              />

              <FilterChipSelect
                label="Роль"
                value={roleFilter}
                displayValue={roleFilter === 'all' ? 'Все' : roleFilter}
                onChange={(value) => setRoleFilter(value as ClientRole | 'all')}
                active={roleFilter !== 'all'}
                options={[{ value: 'all', label: 'Все' }, ...allRoles.map((role) => ({ value: role, label: role }))]}
              />

              <FilterChipSelect
                label="Квалификация"
                value={qualificationFilter}
                displayValue={qualificationLabelByValue[qualificationFilter]}
                onChange={(value) => setQualificationFilter(value as 'all' | 'qualified' | 'not-qualified')}
                active={qualificationFilter !== 'all'}
                options={[
                  { value: 'all', label: 'Все' },
                  { value: 'qualified', label: 'Квалифицированный' },
                  { value: 'not-qualified', label: 'Неквалифицированный' },
                ]}
              />
            </>
          }
          activeFilters={
            hasActiveConditions ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Активно</div>
                <div className="flex flex-wrap items-center gap-2">
                  {search.trim() ? <ActiveFilterChip label="Поиск" value={search.trim()} onRemove={() => setSearch('')} /> : null}
                  {typeFilter !== 'all' ? (
                    <ActiveFilterChip label="Тип" value={formatClientType(typeFilter)} onRemove={() => setTypeFilter('all')} />
                  ) : null}
                  {residencyFilter !== 'all' ? (
                    <ActiveFilterChip
                      label="Резидентство"
                      value={formatResidency(residencyFilter)}
                      onRemove={() => setResidencyFilter('all')}
                    />
                  ) : null}
                  {complianceFilter !== 'all' ? (
                    <ActiveFilterChip
                      label="Комплаенс"
                      value={formatComplianceStatus(complianceFilter)}
                      onRemove={() => setComplianceFilter('all')}
                    />
                  ) : null}
                  {roleFilter !== 'all' ? <ActiveFilterChip label="Роль" value={roleFilter} onRemove={() => setRoleFilter('all')} /> : null}
                  {qualificationFilter !== 'all' ? (
                    <ActiveFilterChip
                      label="Квалификация"
                      value={qualificationLabelByValue[qualificationFilter]}
                      onRemove={() => setQualificationFilter('all')}
                    />
                  ) : null}
                  <Button variant="secondary" size="sm" onClick={resetFilters} className="ml-auto">
                    Сбросить всё
                  </Button>
                </div>
              </div>
            ) : null
          }
        />
      </div>

      <DataTable<Client>
        columns={[
          {
            key: 'code',
            header: 'Код клиента',
            className: 'font-medium text-slate-800',
            sortable: true,
            render: (client) => {
              const totalCodes = client.clientCodes?.length ?? 1;
              const extraCodes = Math.max(0, totalCodes - 1);

              return (
                <div className="inline-flex items-center gap-2 whitespace-nowrap" title={`${totalCodes} кодов клиента`}>
                  <span>{client.code}</span>
                  {extraCodes > 0 ? <Badge variant="neutral">+{extraCodes}</Badge> : null}
                </div>
              );
            },
          },
          { key: 'name', header: 'Наименование клиента', className: 'min-w-[260px]', sortable: true },
          { key: 'inn', header: 'ИНН', sortable: true },
          {
            key: 'type',
            header: 'Тип',
            sortable: true,
            render: (client) => <Badge variant={getClientTypeBadgeVariant(client.type)}>{formatClientType(client.type)}</Badge>,
          },
          {
            key: 'residency',
            header: 'Резидент',
            sortable: true,
            render: (client) => (
              <Badge variant={getResidencyBadgeVariant(client.residency)}>{formatResidency(client.residency)}</Badge>
            ),
          },
          {
            key: 'complianceStatus',
            header: 'Статус комплаенса',
            sortable: true,
            render: (client) => (
              <Badge variant={getComplianceBadgeVariant(client.complianceStatus)}>
                {formatComplianceStatus(client.complianceStatus)}
              </Badge>
            ),
          },
          {
            key: 'fullDocumentSet',
            header: 'Полный комплект',
            sortable: true,
            render: (client) => (
              <Badge variant={client.fullDocumentSet ? 'success' : 'warning'}>{client.fullDocumentSet ? 'Да' : 'Нет'}</Badge>
            ),
          },
        ]}
        rows={paginatedClients}
        emptyMessage="По выбранным фильтрам данных нет"
        rowClassName={() => 'cursor-pointer'}
        onRowClick={(client) => navigate(`/subjects/${client.id}`)}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={handleSort}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageSizeSelector
          value={pageSize}
          onChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
        />
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
