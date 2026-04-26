import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { PageShell } from '../components/layout/PageShell';
import { PageToolbar } from '../components/layout/PageToolbar';
import {
  Button,
  DataTable,
  FilterChipSelect,
  PageSizeSelector,
  Pagination,
  SearchInput,
  TableStatusText,
  type SortDirection,
} from '../components/ui';
import { useDataAccess } from '../app/dataAccess/useDataAccess';
import type { Client, TradingMethod, TradingProfile, TradingRiskLevel, TradingStatus } from '../data/types';
import { tradingStatusTone } from '../utils/tableStatus';
import { buildDatedCsvFileName, exportToCsv } from '../utils/csv';
import { routes } from '../routes/paths';

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
  const { clients: clientsRepository, trading: tradingRepository } = useDataAccess();
  const navigate = useNavigate();
  const [tradingProfiles, setTradingProfiles] = useState<TradingProfile[]>([]);
  const [clientsById, setClientsById] = useState<Record<string, Client>>({});

  const [qualificationFilter, setQualificationFilter] = useState<BooleanFilter>('all');
  const [podFtFilter, setPodFtFilter] = useState<BooleanFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState<TradingSortKey>('clientName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    let isMounted = true;

    void Promise.all([tradingRepository.listTradingItems(), clientsRepository.listClients()]).then(
      ([tradingItems, clients]) => {
        if (!isMounted) {
          return;
        }

        setTradingProfiles(tradingItems);
        setClientsById(Object.fromEntries(clients.map((client) => [client.id, client])));
      },
    );

    return () => {
      isMounted = false;
    };
  }, [clientsRepository, tradingRepository]);

  const rows = useMemo<TradingRow[]>(
    () =>
      tradingProfiles.flatMap((profile) => {
        const client = clientsById[profile.clientId];

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
    [clientsById, tradingProfiles],
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
  const hasRowsForExport = sortedRows.length > 0;

  const qualificationLabel = qualificationFilter === 'all' ? 'Все' : qualificationFilter === 'yes' ? 'Да' : 'Нет';
  const podFtLabel = podFtFilter === 'all' ? 'Все' : podFtFilter === 'yes' ? 'Да' : 'Нет';

  const handleExport = () => {
    exportToCsv(
      sortedRows,
      [
        { header: 'Клиент', value: (row) => row.clientName },
        { header: 'Код', value: (row) => row.clientCode },
        { header: 'Инвестор', value: (row) => row.investorStatus },
        { header: 'Риск', value: (row) => row.riskLevel },
        { header: 'Договор', value: (row) => row.brokerContractNumber },
        { header: 'Распорядитель', value: (row) => row.accountDisposer.name },
        { header: 'Способ торговли', value: (row) => row.tradingMethods.join(', ') },
        { header: 'Полномочия до', value: (row) => row.authorityUntil },
        { header: 'Статус', value: (row) => row.tradingStatus },
      ],
      buildDatedCsvFileName('trading'),
    );
  };

  return (
    <PageShell>
      <PageHeader title="Трейдинг" />

      <PageToolbar
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

            <Button variant="secondary" size="sm" onClick={resetFilters} className="ml-auto" disabled={!hasActiveConditions}>
              Сбросить всё
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExport} disabled={!hasRowsForExport}>
              Экспорт
            </Button>
          </>
        }
      />

      <DataTable<TradingRow>
        columns={[
          { key: 'clientName', header: 'Клиент', className: 'min-w-[240px] max-w-[300px] truncate', sortable: true },
          { key: 'clientCode', header: 'Код', className: 'font-medium text-[var(--color-text-primary)] whitespace-nowrap', sortable: true },
          {
            key: 'investorStatus',
            header: 'Инвестор',
            sortable: true,
            render: (row) => (
              <TableStatusText tone={tradingStatusTone.investor[row.investorStatus]}>{row.investorStatus}</TableStatusText>
            ),
          },
          {
            key: 'riskLevel',
            header: 'Риск',
            sortable: true,
            render: (row) => <TableStatusText tone={tradingStatusTone.risk[row.riskLevel]}>{row.riskLevel}</TableStatusText>,
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
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                {row.tradingMethods.map((method: TradingMethod) => (
                  <TableStatusText key={method} tone={tradingStatusTone.method[method]}>
                    {method}
                  </TableStatusText>
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
            render: (row) => (
              <TableStatusText tone={tradingStatusTone.tradingStatus[row.tradingStatus]}>{row.tradingStatus}</TableStatusText>
            ),
          },
        ]}
        rows={paginatedRows}
        emptyMessage="По выбранным фильтрам данных нет"
        onRowClick={(row) => navigate(routes.tradingCard(row.clientId))}
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
    </PageShell>
  );
};
