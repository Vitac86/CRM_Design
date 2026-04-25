import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { PageShell } from '../components/layout/PageShell';
import { PageToolbar } from '../components/layout/PageToolbar';
import { Badge, DataTable, FilterChipSelect, SearchInput } from '../components/ui';
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
    <PageShell>
      <PageHeader title="Доверительное управление" />

      <PageToolbar
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
          { key: 'contractNumber', header: 'Договор ДУ', className: 'whitespace-nowrap font-medium' },
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
    </PageShell>
  );
};
