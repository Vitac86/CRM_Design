import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDataAccess } from '../app/dataAccess/useDataAccess';
import type { Client, ClientRole, ClientType, ComplianceStatus, ResidencyStatus, SubjectStatus } from '../data/types';
import {
  Button,
  DataTable,
  FilterChipSelect,
  PageSizeSelector,
  Pagination,
  SearchInput,
  TableControlPanel,
  TableStatusText,
  type SortDirection,
} from '../components/ui';
import { formatClientType, formatComplianceStatus, formatResidency, formatSubjectStatus } from '../utils/labels';
import { subjectStatusTone } from '../utils/tableStatus';

const allRoles: ClientRole[] = ['Клиент', 'Бенефициар', 'Представитель'];
const subjectStatusValues: SubjectStatus[] = ['Регистрация', 'Активный клиент', 'На комплаенсе', 'Данные заполнены'];
type SubjectsSortKey = 'name' | 'inn' | 'type' | 'residency' | 'subjectStatus' | 'complianceStatus' | 'fullDocumentSet';

const normalizeSubjectStatus = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

const parseSubjectStatus = (value: string | null): SubjectStatus | 'all' => {
  if (!value) {
    return 'all';
  }

  const normalizedValue = normalizeSubjectStatus(value);
  const matchedValue = subjectStatusValues.find((status) => normalizeSubjectStatus(status) === normalizedValue);

  return matchedValue ?? 'all';
};

export const SubjectsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { clients: clientsDataAccess } = useDataAccess();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<ClientType | 'all'>(() => {
    const value = searchParams.get('type');
    return value === 'ООО' || value === 'ИП' || value === 'ПАО' || value === 'ЗАО' || value === 'АО' || value === 'ФЛ' ? value : 'all';
  });
  const [residencyFilter, setResidencyFilter] = useState<ResidencyStatus | 'all'>(() => {
    const value = searchParams.get('residency');
    return value === 'Резидент РФ' || value === 'Нерезидент' ? value : 'all';
  });
  const [subjectStatusFilter, setSubjectStatusFilter] = useState<SubjectStatus | 'all'>(() => {
    const value = searchParams.get('subjectStatus');
    return parseSubjectStatus(value);
  });
  const [complianceFilter, setComplianceFilter] = useState<ComplianceStatus | 'all'>(() => {
    const value = searchParams.get('complianceStatus');
    return value === 'ПРОЙДЕН' || value === 'НА ПРОВЕРКЕ' || value === 'НА ДОРАБОТКЕ' || value === 'ЗАБЛОКИРОВАН' ? value : 'all';
  });
  const [qualificationFilter, setQualificationFilter] = useState<'all' | 'qualified' | 'not-qualified'>(() => {
    const value = searchParams.get('qualification');
    return value === 'qualified' || value === 'not-qualified' ? value : 'all';
  });
  const [roleFilter, setRoleFilter] = useState<ClientRole | 'all'>(() => {
    const value = searchParams.get('role');
    return value === 'Клиент' || value === 'Бенефициар' || value === 'Представитель' ? value : 'all';
  });
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState<SubjectsSortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const activeClients = useMemo(() => clients.filter((client) => client.isArchived !== true), [clients]);
  const typeOptions = useMemo(() => [...new Set(activeClients.map((client) => client.type))], [activeClients]);
  const residencyOptions = useMemo(() => [...new Set(activeClients.map((client) => client.residency))], [activeClients]);
  const complianceOptions = useMemo(() => [...new Set(activeClients.map((client) => client.complianceStatus))], [activeClients]);
  const subjectStatusOptions = useMemo(() => [...new Set(activeClients.map((client) => client.subjectStatus))], [activeClients]);

  const filteredClients = useMemo(
    () =>
      activeClients.filter((client) => {
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
        if (
          subjectStatusFilter !== 'all' &&
          normalizeSubjectStatus(client.subjectStatus) !== normalizeSubjectStatus(subjectStatusFilter)
        ) {
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
    [activeClients, search, typeFilter, residencyFilter, subjectStatusFilter, complianceFilter, qualificationFilter, roleFilter],
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
    let isCancelled = false;

    const loadClients = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const loadedClients = await clientsDataAccess.listClients();
        if (!isCancelled) {
          setClients(loadedClients);
        }
      } catch {
        if (!isCancelled) {
          setError('Не удалось загрузить список субъектов.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadClients();

    return () => {
      isCancelled = true;
    };
  }, [clientsDataAccess]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, residencyFilter, subjectStatusFilter, complianceFilter, qualificationFilter, roleFilter]);

  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (search.trim()) {
      nextParams.set('search', search.trim());
    }
    if (typeFilter !== 'all') {
      nextParams.set('type', typeFilter);
    }
    if (residencyFilter !== 'all') {
      nextParams.set('residency', residencyFilter);
    }
    if (subjectStatusFilter !== 'all') {
      nextParams.set('subjectStatus', subjectStatusFilter);
    }
    if (complianceFilter !== 'all') {
      nextParams.set('complianceStatus', complianceFilter);
    }
    if (qualificationFilter !== 'all') {
      nextParams.set('qualification', qualificationFilter);
    }
    if (roleFilter !== 'all') {
      nextParams.set('role', roleFilter);
    }

    setSearchParams(nextParams, { replace: true });
  }, [
    search,
    typeFilter,
    residencyFilter,
    subjectStatusFilter,
    complianceFilter,
    qualificationFilter,
    roleFilter,
    setSearchParams,
  ]);

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
    setSubjectStatusFilter('all');
    setComplianceFilter('all');
    setQualificationFilter('all');
    setRoleFilter('all');
    setPage(1);
  };

  const hasActiveConditions =
    search.trim().length > 0 ||
    typeFilter !== 'all' ||
    residencyFilter !== 'all' ||
    subjectStatusFilter !== 'all' ||
    complianceFilter !== 'all' ||
    qualificationFilter !== 'all' ||
    roleFilter !== 'all';

  const qualificationLabelByValue: Record<'all' | 'qualified' | 'not-qualified', string> = {
    all: 'Все',
    qualified: 'Квалифицированный',
    'not-qualified': 'Неквалифицированный',
  };

  return (
    <div className="min-w-0 space-y-4 rounded-2xl bg-slate-100/80 p-4 sm:p-5">
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
                label="Статус субъекта"
                value={subjectStatusFilter}
                displayValue={subjectStatusFilter === 'all' ? 'Все' : formatSubjectStatus(subjectStatusFilter)}
                onChange={(value) => setSubjectStatusFilter(value as SubjectStatus | 'all')}
                active={subjectStatusFilter !== 'all'}
                options={[
                  { value: 'all', label: 'Все' },
                  ...subjectStatusOptions.map((status) => ({ value: status, label: formatSubjectStatus(status) })),
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

              <Button variant="secondary" size="sm" onClick={resetFilters} className="ml-auto" disabled={!hasActiveConditions}>
                Сбросить всё
              </Button>
            </>
          }
        />
      </div>

      <DataTable<Client>
        columns={[
          { key: 'name', header: 'Наименование клиента', className: 'min-w-[260px]', sortable: true },
          { key: 'inn', header: 'ИНН', sortable: true },
          {
            key: 'type',
            header: 'Тип',
            sortable: true,
            render: (client) => (
              <TableStatusText tone={subjectStatusTone.clientType[client.type]}>{formatClientType(client.type)}</TableStatusText>
            ),
          },
          {
            key: 'residency',
            header: 'Резидент',
            sortable: true,
            render: (client) => (
              <TableStatusText tone={subjectStatusTone.residency[client.residency]}>
                {formatResidency(client.residency)}
              </TableStatusText>
            ),
          },
          {
            key: 'subjectStatus',
            header: 'Статус субъекта',
            sortable: true,
            render: (client) => (
              <TableStatusText tone={subjectStatusTone.subject[client.subjectStatus]}>
                {formatSubjectStatus(client.subjectStatus)}
              </TableStatusText>
            ),
          },
          {
            key: 'complianceStatus',
            header: 'Статус комплаенса',
            sortable: true,
            render: (client) => (
              <TableStatusText tone={subjectStatusTone.compliance[client.complianceStatus]}>
                {formatComplianceStatus(client.complianceStatus)}
              </TableStatusText>
            ),
          },
          {
            key: 'fullDocumentSet',
            header: 'Полный комплект',
            sortable: true,
            render: (client) => (
              <TableStatusText tone={subjectStatusTone.fullDocumentSet[String(client.fullDocumentSet) as 'true' | 'false']}>
                {client.fullDocumentSet ? 'Да' : 'Нет'}
              </TableStatusText>
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

      {isLoading && <p className="text-sm text-slate-500">Загрузка списка субъектов…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

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
