import { useMemo, useState } from 'react';
import { Badge, Card, DataTable, FilterChipSelect, SearchInput, TableControlPanel } from '../components/ui';
import { brokerageContracts, type BrokerageContract, type BrokerageContractStatus } from '../data/brokerage';

const badgeByStatus: Record<BrokerageContractStatus, 'success' | 'info' | 'warning' | 'neutral'> = {
  'Активен': 'success',
  'На подписании': 'info',
  'Приостановлен': 'warning',
  'Закрыт': 'neutral',
};

export const BrokeragePage = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BrokerageContractStatus | 'all'>('all');

  const filteredContracts = useMemo(
    () =>
      brokerageContracts.filter((contract) => {
        const normalizedSearch = search.trim().toLowerCase();

        if (
          normalizedSearch.length > 0 &&
          ![contract.contractNumber, contract.accountNumber, contract.clientName, contract.manager]
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
    [search, statusFilter],
  );

  const activeCount = brokerageContracts.filter((contract) => contract.status === 'Активен').length;
  const onSigningCount = brokerageContracts.filter((contract) => contract.status === 'На подписании').length;

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Брокерская деятельность</h1>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-slate-500">Всего договоров</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{brokerageContracts.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Активные</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{activeCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">На подписании</p>
          <p className="mt-1 text-2xl font-semibold text-sky-700">{onSigningCount}</p>
        </Card>
      </section>

      <TableControlPanel
        search={
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по договору, счёту, клиенту или менеджеру"
          />
        }
        filters={
          <FilterChipSelect
            label="Статус"
            value={statusFilter}
            displayValue={statusFilter === 'all' ? 'Все' : statusFilter}
            onChange={(value) => setStatusFilter(value as BrokerageContractStatus | 'all')}
            options={[
              { value: 'all', label: 'Все' },
              { value: 'Активен', label: 'Активен' },
              { value: 'На подписании', label: 'На подписании' },
              { value: 'Приостановлен', label: 'Приостановлен' },
              { value: 'Закрыт', label: 'Закрыт' },
            ]}
          />
        }
      />

      <DataTable<BrokerageContract>
        columns={[
          { key: 'contractNumber', header: 'Договор', className: 'font-medium text-slate-800 whitespace-nowrap' },
          { key: 'accountNumber', header: 'Счёт', className: 'whitespace-nowrap' },
          { key: 'clientName', header: 'Клиент' },
          { key: 'manager', header: 'Менеджер', className: 'whitespace-nowrap' },
          { key: 'openedAt', header: 'Дата открытия', className: 'whitespace-nowrap' },
          { key: 'turnover', header: 'Оборот', className: 'whitespace-nowrap' },
          {
            key: 'status',
            header: 'Статус',
            render: (contract) => <Badge variant={badgeByStatus[contract.status]}>{contract.status}</Badge>,
          },
        ]}
        rows={filteredContracts}
        emptyMessage="По выбранным фильтрам брокерских записей нет"
      />
    </div>
  );
};
