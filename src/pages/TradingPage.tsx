import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, DataTable, FilterBar, Pagination, SearchInput, SelectFilter } from '../components/ui';
import { getClientById } from '../data/clients';
import { tradingProfiles } from '../data/trading';
import type { TradingMethod, TradingProfile, TradingRiskLevel } from '../data/types';

type BooleanFilter = 'all' | 'yes' | 'no';

type TradingRow = TradingProfile & {
  podFt: boolean;
  clientCode: string;
  clientName: string;
};

const PAGE_SIZE = 10;

const riskBadgeByLevel: Record<TradingRiskLevel, 'success' | 'info' | 'warning' | 'orange'> = {
  Стандартный: 'success',
  Начальный: 'info',
  Повышенный: 'warning',
  Особый: 'orange',
};

export const TradingPage = () => {
  const navigate = useNavigate();

  const [qualificationFilter, setQualificationFilter] = useState<BooleanFilter>('all');
  const [podFtFilter, setPodFtFilter] = useState<BooleanFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [qualificationFilter, podFtFilter, search]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedRows = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;

    return filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredRows, page]);

  const resetFilters = () => {
    setSearch('');
    setQualificationFilter('all');
    setPodFtFilter('all');
    setPage(1);
  };

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Трейдинг</h1>
      </header>

      <FilterBar>
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск по клиенту, коду или договору"
          className="w-full min-w-[220px] sm:w-72"
        />

        <SelectFilter
          value={qualificationFilter}
          onChange={(event) => setQualificationFilter(event.target.value as BooleanFilter)}
        >
          <option value="all">Квалификация</option>
          <option value="yes">Да</option>
          <option value="no">Нет</option>
        </SelectFilter>

        <SelectFilter value={podFtFilter} onChange={(event) => setPodFtFilter(event.target.value as BooleanFilter)}>
          <option value="all">ПОД / ФТ</option>
          <option value="yes">Да</option>
          <option value="no">Нет</option>
        </SelectFilter>

        <Button variant="secondary" className="ml-auto" onClick={resetFilters}>
          Очистить фильтры
        </Button>
      </FilterBar>

      <DataTable<TradingRow>
        columns={[
          { key: 'clientName', header: 'Клиент', className: 'min-w-[240px] max-w-[300px] truncate' },
          { key: 'clientCode', header: 'Код', className: 'font-medium text-slate-800 whitespace-nowrap' },
          {
            key: 'investorStatus',
            header: 'Инвестор',
            render: (row) => <Badge variant={row.investorStatus === 'Квал' ? 'brand' : 'neutral'}>{row.investorStatus}</Badge>,
          },
          {
            key: 'riskLevel',
            header: 'Риск',
            render: (row) => <Badge variant={riskBadgeByLevel[row.riskLevel]}>{row.riskLevel}</Badge>,
          },
          {
            key: 'brokerContractNumber',
            header: 'Договор',
            className: 'whitespace-nowrap',
          },
          {
            key: 'accountDisposer',
            header: 'Распорядитель',
            className: 'whitespace-nowrap',
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
          },
          {
            key: 'tradingStatus',
            header: 'Статус',
            render: (row) => <Badge variant={row.tradingStatus === 'Активен' ? 'success' : 'danger'}>{row.tradingStatus}</Badge>,
          },
        ]}
        rows={paginatedRows}
        emptyMessage="По выбранным фильтрам данных нет"
        onRowClick={(row) => navigate(`/trading/${row.clientId}`)}
      />

      <Pagination
        className="justify-end"
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((prev) => Math.max(1, prev - 1))}
        onNext={() => setPage((prev) => Math.min(totalPages, prev + 1))}
      />
    </div>
  );
};
