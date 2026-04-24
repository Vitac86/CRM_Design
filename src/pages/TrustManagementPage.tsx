import { useEffect, useMemo, useState } from 'react';
import { Badge, DataTable, FilterChipSelect, SearchInput, TableControlPanel } from '../components/ui';
import { useDataAccess } from '../app/dataAccess/useDataAccess';
import type { TrustContract, TrustContractStatus } from '../features/operations/api/operationsRepository';

const badgeByStatus: Record<TrustContractStatus, 'success' | 'info' | 'neutral'> = {
  'Активен': 'success',
  'На подписании': 'info',
  'Закрыт': 'neutral',
};

export const TrustManagementPage = () => {
  const { operations } = useDataAccess();
  const [contracts, setContracts] = useState<TrustContract[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TrustContractStatus | 'all'>('all');

  useEffect(() => {
    let isMounted = true;

    void operations.listTrustContracts().then((items) => {
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

        if (normalizedSearch && ![contract.contractNumber, contract.clientName, contract.strategy].join(' ').toLowerCase().includes(normalizedSearch)) {
          return false;
        }

        if (statusFilter !== 'all' && contract.status !== statusFilter) {
          return false;
        }

        return true;
      }),
    [contracts, search, statusFilter],
  );

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Доверительное управление</h1>
      </header>

      <TableControlPanel
        search={
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по договору, клиенту или стратегии"
          />
        }
        filters={
          <FilterChipSelect
            label="Статус"
            value={statusFilter}
            displayValue={statusFilter === 'all' ? 'Все' : statusFilter}
            onChange={(value) => setStatusFilter(value as TrustContractStatus | 'all')}
            options={[
              { value: 'all', label: 'Все' },
              { value: 'Активен', label: 'Активен' },
              { value: 'На подписании', label: 'На подписании' },
              { value: 'Закрыт', label: 'Закрыт' },
            ]}
          />
        }
      />

      <DataTable<TrustContract>
        columns={[
          { key: 'contractNumber', header: 'Договор ДУ', className: 'font-medium text-slate-800 whitespace-nowrap' },
          { key: 'clientName', header: 'Клиент' },
          { key: 'strategy', header: 'Стратегия', className: 'whitespace-nowrap' },
          { key: 'portfolioValue', header: 'Стоимость портфеля', className: 'whitespace-nowrap' },
          { key: 'startDate', header: 'Дата начала', className: 'whitespace-nowrap' },
          {
            key: 'status',
            header: 'Статус',
            render: (contract) => <Badge variant={badgeByStatus[contract.status]}>{contract.status}</Badge>,
          },
        ]}
        rows={filteredContracts}
        emptyMessage="Договоры доверительного управления не найдены"
      />
    </div>
  );
};
