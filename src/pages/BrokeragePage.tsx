import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { PageShell } from '../components/layout/PageShell';
import { PageToolbar } from '../components/layout/PageToolbar';
import { Badge, Button, DataTable, FilterChipSelect, SearchInput, type SortDirection } from '../components/ui';
import { buildDatedCsvFileName, exportToCsv } from '../utils/csv';
import { useDataAccess } from '../app/dataAccess/useDataAccess';
import type { BrokerageContract, BrokerageContractStatus } from '../features/operations/api/operationsRepository';

type BrokerageSortKey = 'contractNumber' | 'clientCode' | 'clientName' | 'manager' | 'openedAt' | 'status';

const badgeByStatus: Record<BrokerageContractStatus, 'success' | 'warning' | 'neutral'> = {
  'Активен': 'success',
  'Приостановлен': 'warning',
  'Закрыт': 'neutral',
};

export const BrokeragePage = () => {
  const { operations } = useDataAccess();
  const [contracts, setContracts] = useState<BrokerageContract[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BrokerageContractStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<BrokerageSortKey>('contractNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    let isMounted = true;

    void operations.listBrokerageContracts().then((items) => {
      if (isMounted) {
        setContracts(items);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [operations]);

  const filteredContracts = useMemo(
    () =>
      contracts.filter((contract) => {
        const normalizedSearch = search.trim().toLowerCase();

        if (
          normalizedSearch.length > 0 &&
          ![contract.contractNumber, contract.clientCode, contract.clientName, contract.manager]
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch)
        ) {
          return false;
        }

        if (statusFilter !== 'all' && contract.status !== statusFilter) {
          return false;
        }

        return true;
      }),
    [contracts, search, statusFilter],
  );

  const sortedContracts = useMemo(() => {
    const list = [...filteredContracts];

    list.sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      return a[sortKey].localeCompare(b[sortKey], 'ru') * direction;
    });

    return list;
  }, [filteredContracts, sortDirection, sortKey]);

  const handleSort = (nextSortKey: string) => {
    if (nextSortKey === sortKey) {
      setSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(nextSortKey as BrokerageSortKey);
      setSortDirection('asc');
    }
  };

  const handleExport = () => {
    exportToCsv(
      sortedContracts,
      [
        { header: 'Договор', value: (contract) => contract.contractNumber },
        { header: 'Код клиента', value: (contract) => contract.clientCode },
        { header: 'Клиент', value: (contract) => contract.clientName },
        { header: 'Менеджер', value: (contract) => contract.manager },
        { header: 'Дата открытия', value: (contract) => contract.openedAt },
        { header: 'Статус', value: (contract) => contract.status },
      ],
      buildDatedCsvFileName('brokerage'),
    );
  };

  return (
    <PageShell>
      <PageHeader title="Брокерская деятельность" />

      <PageToolbar
        search={
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по договору, коду клиента, клиенту или менеджеру"
          />
        }
        filters={
          <>
            <FilterChipSelect
              label="Статус"
              value={statusFilter}
              displayValue={statusFilter === 'all' ? 'Все' : statusFilter}
              onChange={(value) => setStatusFilter(value as BrokerageContractStatus | 'all')}
              options={[
                { value: 'all', label: 'Все' },
                { value: 'Активен', label: 'Активен' },
                { value: 'Приостановлен', label: 'Приостановлен' },
                { value: 'Закрыт', label: 'Закрыт' },
              ]}
            />
            <Button
              variant="secondary"
              size="sm"
              className="ml-auto"
              onClick={handleExport}
              disabled={sortedContracts.length === 0}
            >
              Экспорт
            </Button>
          </>
        }
      />

      <DataTable<BrokerageContract>
        columns={[
          {
            key: 'contractNumber',
            header: 'Договор',
            className: 'whitespace-nowrap font-medium',
            sortable: true,
            render: (contract) => (
              <Link
                to={`/subjects/${contract.clientId}/contract-wizard?contractId=${contract.contractId}`}
                className="crm-link hover:underline focus-visible:underline"
              >
                {contract.contractNumber}
              </Link>
            ),
          },
          { key: 'clientCode', header: 'Код клиента', className: 'whitespace-nowrap', sortable: true },
          {
            key: 'clientName',
            header: 'Клиент',
            sortable: true,
            render: (contract) => (
              <Link
                to={`/subjects/${contract.clientId}`}
                className="crm-link hover:underline focus-visible:underline"
              >
                {contract.clientName}
              </Link>
            ),
          },
          { key: 'manager', header: 'Менеджер', className: 'whitespace-nowrap', sortable: true },
          { key: 'openedAt', header: 'Дата открытия', className: 'whitespace-nowrap', sortable: true },
          {
            key: 'status',
            header: 'Статус',
            sortable: true,
            render: (contract) => <Badge variant={badgeByStatus[contract.status]}>{contract.status}</Badge>,
          },
        ]}
        rows={sortedContracts}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={handleSort}
        emptyMessage="По выбранным фильтрам брокерских записей нет"
      />
    </PageShell>
  );
};
