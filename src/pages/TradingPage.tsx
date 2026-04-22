import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { getClientById } from '../data/clients';
import { tradingProfiles } from '../data/trading';
import type { TradingMethod, TradingProfile, TradingRiskLevel, TradingStatus } from '../data/types';

type BooleanFilter = 'all' | 'yes' | 'no';

type TradingRow = TradingProfile & {
  podFt: boolean;
  clientCode: string;
  clientName: string;
  accountDisposerName: string;
};

type TradingSortKey =
  | 'clientName'
  | 'clientCode'
  | 'investorStatus'
  | 'riskLevel'
  | 'brokerContractNumber'
  | 'accountDisposerName'
  | 'authorityUntil'
  | 'tradingStatus';

const riskBadgeByLevel: Record<TradingRiskLevel, 'success' | 'info' | 'warning' | 'orange'> = {
  Стандартный: 'success',
  Начальный: 'info',
  Повышенный: 'warning',
  Особый: 'orange',
};

const riskOrder: Record<TradingRiskLevel, number> = {
  Стандартный: 0,
  Начальный: 1,
  Повышенный: 2,
  Особый: 3,
};

const tradingStatusOrder: Record<TradingStatus, number> = {
  Активен: 0,
  Истёк: 1,
};

const investorOrder: Record<'Квал' | 'Неквал', number> = {
  Неквал: 0,
  Квал: 1,
};

const parseRuDate = (value: string) => {
  const [day, month, year] = value.split('.').map(Number);

  if (!day || !month || !year) {
    return Number.NaN;
  }

  return new Date(year, month - 1, day).getTime();
};

export const TradingPage = () => {
  const navigate = useNavigate();

  const [qualificationFilter, setQualificationFilter] = useState<BooleanFilter>('all');
  const [podFtFilter, setPodFtFilter] = useState<BooleanFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState<TradingSortKey>('clientName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const rows = useMemo<TradingRow[]>(
    () =>
      tradingProfiles.flatMap((profile) => {
        const client = getClientById(profile.clientId);

        if (!client) {
          return [];
        }

        const podFt = profile.allowCashUsage && profile.allowSecuritiesUsage;

        return {
          ...profile,
          podFt,
          clientCode: client.code,
          clientName: client.name,
          accountDisposerName: profile.accountDisposer.name,
        };
      }),
    [],
  );

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const normalizedSearch = search.trim().toLowerCase();

        if (
          normalizedSearch &&
          ![row.clientName, row.clientCode, row.brokerContractNumber, row.accountDisposer.name].some((value) =>
            value.toLowerCase().includes(normalizedSearch),
          )
        ) {
          return false;
        }

        if (qualificationFilter === 'yes' && !row.qualifiedInvestor) {
          return false;
        }

        if (qualificationFilter === 'no' && row.qualifiedInvestor) {
          return false;
        }

        if (podFtFilter === 'yes' && !row.podFt) {
          return false;
        }

        if (podFtFilter === 'no' && row.podFt) {
          return false;
        }

        return true;
      }),
    [podFtFilter, qualificationFilter, rows, search],
  );

  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    const direction = sortDirection === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      switch (sortKey) {
        case 'riskLevel':
          return (riskOrder[a.riskLevel] - riskOrder[b.riskLevel]) * direction;
        case 'tradingStatus':
          return (tradingStatusOrder[a.tradingStatus] - tradingStatusOrder[b.tradingStatus]) * direction;
        case 'investorStatus':
          return (investorOrder[a.investorStatus] - investorOrder[b.investorStatus]) * direction;
        case 'authorityUntil': {
          const leftDate = parseRuDate(a.authorityUntil);
          const rightDate = parseRuDate(b.authorityUntil);

          if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate)) {
            return (leftDate - rightDate) * direction;
          }

          return a.authorityUntil.localeCompare(b.authorityUntil, 'ru') * direction;
        }
        case 'accountDisposerName':
          return a.accountDisposer.name.localeCompare(b.accountDisposer.name, 'ru') * direction;
        default:
          return String(a[sortKey]).localeCompare(String(b[sortKey]), 'ru') * direction;
      }
    });

    return list;
  }, [filteredRows, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [qualificationFilter, podFtFilter, search]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedRows = useMemo(() => {
    const startIndex = (page - 1) * pageSize;

    return sortedRows.slice(startIndex, startIndex + pageSize);
  }, [sortedRows, page, pageSize]);

  const resetFilters = () => {
    setSearch('');
    setQualificationFilter('all');
    setPodFtFilter('all');
    setPage(1);
  };

  const handleSort = (nextSortKey: string) => {
    if (nextSortKey === sortKey) {
      setSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(nextSortKey as TradingSortKey);
      setSortDirection('asc');
    }

    setPage(1);
  };

  const hasActiveConditions = search.trim().length > 0 || qualificationFilter !== 'all' || podFtFilter !== 'all';

  const qualificationLabel = qualificationFilter === 'all' ? 'Все' : qualificationFilter === 'yes' ? 'Да' : 'Нет';
  const podFtLabel = podFtFilter === 'all' ? 'Все' : podFtFilter === 'yes' ? 'Да' : 'Нет';

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Трейдинг</h1>
      </header>

      <div>
        <TableControlPanel
          search={
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по клиенту, коду, договору или распорядителю"
              className="w-full"
            />
          }
          filters={
            <>
              <FilterChipSelect
                label="Квалификация"
                value={qualificationFilter}
                displayValue={qualificationLabel}
                onChange={(value) => setQualificationFilter(value as BooleanFilter)}
                active={qualificationFilter !== 'all'}
                options={[
                  { value: 'all', label: 'Все' },
                  { value: 'yes', label: 'Да' },
                  { value: 'no', label: 'Нет' },
                ]}
              />

              <FilterChipSelect
                label="ПОД / ФТ"
                value={podFtFilter}
                displayValue={podFtLabel}
                onChange={(value) => setPodFtFilter(value as BooleanFilter)}
                active={podFtFilter !== 'all'}
                options={[
                  { value: 'all', label: 'Все' },
                  { value: 'yes', label: 'Да' },
                  { value: 'no', label: 'Нет' },
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
                  {qualificationFilter !== 'all' ? (
                    <ActiveFilterChip label="Квалификация" value={qualificationLabel} onRemove={() => setQualificationFilter('all')} />
                  ) : null}
                  {podFtFilter !== 'all' ? (
                    <ActiveFilterChip label="ПОД / ФТ" value={podFtLabel} onRemove={() => setPodFtFilter('all')} />
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

      <DataTable<TradingRow>
        columns={[
          { key: 'clientName', header: 'Клиент', className: 'min-w-[240px] max-w-[300px] truncate', sortable: true },
          { key: 'clientCode', header: 'Код', className: 'font-medium text-slate-800 whitespace-nowrap', sortable: true },
          {
            key: 'investorStatus',
            header: 'Инвестор',
            sortable: true,
            render: (row) => <Badge variant={row.investorStatus === 'Квал' ? 'brand' : 'neutral'}>{row.investorStatus}</Badge>,
          },
          {
            key: 'riskLevel',
            header: 'Риск',
            sortable: true,
            render: (row) => <Badge variant={riskBadgeByLevel[row.riskLevel]}>{row.riskLevel}</Badge>,
          },
          {
            key: 'brokerContractNumber',
            header: 'Договор',
            className: 'whitespace-nowrap',
            sortable: true,
          },
          {
            key: 'accountDisposer',
            sortKey: 'accountDisposerName',
            header: 'Распорядитель',
            className: 'whitespace-nowrap',
            sortable: true,
            render: (row) => row.accountDisposer.name,
          },
          {
            key: 'tradingMethods',
            header: 'Способ торговли',
            className: 'min-w-[180px]',
            render: (row) => (
              <div className="flex flex-wrap gap-1.5">
                {row.tradingMethods.map((method: TradingMethod) => (
                  <Badge key={method} variant={method === 'QUIK' ? 'info' : 'purple'}>
                    {method}
                  </Badge>
                ))}
              </div>
            ),
          },
          {
            key: 'authorityUntil',
            header: 'Полномочия до',
            className: 'whitespace-nowrap',
            sortable: true,
          },
          {
            key: 'tradingStatus',
            header: 'Статус',
            sortable: true,
            render: (row) => <Badge variant={row.tradingStatus === 'Активен' ? 'success' : 'danger'}>{row.tradingStatus}</Badge>,
          },
        ]}
        rows={paginatedRows}
        emptyMessage="По выбранным фильтрам данных нет"
        onRowClick={(row) => navigate(`/trading/${row.clientId}`)}
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
          className="justify-end"
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((prev) => Math.max(1, prev - 1))}
          onNext={() => setPage((prev) => Math.min(totalPages, prev + 1))}
        />
      </div>
    </div>
  );
};
