import { useEffect, useMemo, useState } from 'react';
import { useDataAccess } from '../app/dataAccess/useDataAccess';
import { Button, DataTable, EmptyState, SearchInput, SelectFilter, StatusBadge, TableControlPanel, type SortDirection } from '../components/ui';
import type { Client, ClientAccount, ClientContract } from '../data/types';
import { buildDatedCsvFileName, exportToCsv } from '../utils/csv';
import { buildClientJournalRows, type ClientJournalRow } from '../features/middleOffice/lib/buildClientJournalRows';
import { AsyncContent } from '../shared/ui/async';
type ClientJournalSortKey =
  | 'clientCode'
  | 'contractKind'
  | 'clientName'
  | 'inn'
  | 'clientType'
  | 'contractNumber'
  | 'contractDate'
  | 'residencyStatus'
  | 'accountType'
  | 'accountStatus';

export const MiddleOfficeClientsPage = () => {
  const { clients: clientsRepository, contracts: contractsRepository, accounts: accountsRepository } = useDataAccess();

  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [clientSearch, setClientSearch] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState<ClientJournalRow['clientType'] | 'all'>('all');
  const [contractKindFilter, setContractKindFilter] = useState<ClientJournalRow['contractKind'] | 'all'>('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState<ClientJournalRow['accountStatus'] | 'all'>('all');
  const [sortKey, setSortKey] = useState<ClientJournalSortKey>('clientCode');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [loadedClients, loadedContracts, loadedAccounts] = await Promise.all([
          clientsRepository.listClients(),
          contractsRepository.listContracts(),
          accountsRepository.listAccounts(),
        ]);

        if (!isMounted) {
          return;
        }

        setClients(loadedClients);
        setContracts(loadedContracts);
        setAccounts(loadedAccounts);
      } catch {
        if (!isMounted) {
          return;
        }

        setError('Не удалось загрузить журнал клиентов мидл-офиса.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [accountsRepository, clientsRepository, contractsRepository]);

  const clientJournalRows = useMemo<ClientJournalRow[]>(() => buildClientJournalRows(clients, contracts, accounts), [accounts, clients, contracts]);

  const filteredClientJournalRows = useMemo(() => {
    const normalizedSearch = clientSearch.trim().toLowerCase();

    return clientJournalRows.filter((row) => {
      if (
        normalizedSearch &&
        ![row.clientCode, row.clientName, row.inn, row.contractNumber].some((value) => value.toLowerCase().includes(normalizedSearch))
      ) {
        return false;
      }

      if (clientTypeFilter !== 'all' && row.clientType !== clientTypeFilter) {
        return false;
      }

      if (contractKindFilter !== 'all' && row.contractKind !== contractKindFilter) {
        return false;
      }

      if (accountStatusFilter !== 'all' && row.accountStatus !== accountStatusFilter) {
        return false;
      }

      return true;
    });
  }, [accountStatusFilter, clientJournalRows, clientSearch, clientTypeFilter, contractKindFilter]);

  const sortedClientJournalRows = useMemo(() => {
    const rows = [...filteredClientJournalRows];
    const direction = sortDirection === 'asc' ? 1 : -1;

    rows.sort((leftRow, rightRow) => {
      if (sortKey === 'contractDate') {
        const leftTimestamp = Date.parse(leftRow.contractDate.split('.').reverse().join('-'));
        const rightTimestamp = Date.parse(rightRow.contractDate.split('.').reverse().join('-'));

        return (leftTimestamp - rightTimestamp) * direction;
      }

      return (
        String(leftRow[sortKey]).localeCompare(String(rightRow[sortKey]), 'ru', {
          numeric: true,
          sensitivity: 'base',
        }) * direction
      );
    });

    return rows;
  }, [filteredClientJournalRows, sortDirection, sortKey]);

  const handleSortChange = (nextSortKey: string) => {
    if (nextSortKey === sortKey) {
      setSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(nextSortKey as ClientJournalSortKey);
    setSortDirection('asc');
  };

  const resetFilters = () => {
    setClientSearch('');
    setClientTypeFilter('all');
    setContractKindFilter('all');
    setAccountStatusFilter('all');
    setSortKey('clientCode');
    setSortDirection('asc');
  };

  const hasActiveConditions =
    clientSearch.trim().length > 0 ||
    clientTypeFilter !== 'all' ||
    contractKindFilter !== 'all' ||
    accountStatusFilter !== 'all' ||
    sortKey !== 'clientCode' ||
    sortDirection !== 'asc';

  const handleExport = () => {
    exportToCsv(
      sortedClientJournalRows,
      [
        { header: 'Код клиента', value: (row) => row.clientCode },
        { header: 'Вид договора', value: (row) => row.contractKind },
        { header: 'Клиент', value: (row) => row.clientName },
        { header: 'ИНН', value: (row) => row.inn },
        { header: 'Тип клиента', value: (row) => row.clientType },
        { header: 'Номер договора', value: (row) => row.contractNumber },
        { header: 'Дата договора', value: (row) => row.contractDate },
        { header: 'Резидентство', value: (row) => row.residencyStatus },
        { header: 'Тип счёта', value: (row) => row.accountType },
        { header: 'Статус счёта', value: (row) => row.accountStatus },
      ],
      buildDatedCsvFileName('middle-office-clients'),
    );
  };

  return (
    <div className="min-w-0 space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5">
      <header>
        <h1 className="font-heading text-2xl font-semibold text-[var(--color-text-primary)]">Мидл-офис — Журнал клиентов</h1>
      </header>

      <AsyncContent
        isLoading={isLoading}
        error={error}
        loadingFallback={<EmptyState title="Загрузка..." description="Загружаем журнал клиентов мидл-офиса." />}
        errorFallback={error ? <EmptyState title="Ошибка загрузки" description={error} /> : undefined}
      >
        <section className="space-y-3">
          <TableControlPanel
            search={
              <SearchInput
                value={clientSearch}
                onChange={(event) => setClientSearch(event.target.value)}
                placeholder="Поиск по коду, клиенту, ИНН или договору..."
              />
            }
            filters={
              <>
                <SelectFilter value={clientTypeFilter} onChange={(event) => setClientTypeFilter(event.target.value as ClientJournalRow['clientType'] | 'all')}>
                  <option value="all">Тип клиента</option>
                  <option value="Физ. лицо">Физ. лицо</option>
                  <option value="Юр. лицо">Юр. лицо</option>
                  <option value="ИП">ИП</option>
                </SelectFilter>
                <SelectFilter
                  value={contractKindFilter}
                  onChange={(event) => setContractKindFilter(event.target.value as ClientJournalRow['contractKind'] | 'all')}
                >
                  <option value="all">Вид договора</option>
                  <option value="БО">БО</option>
                  <option value="Депозитарный">Депозитарный</option>
                  <option value="ДУ">ДУ</option>
                  <option value="ИИС">ИИС</option>
                  <option value="Дилерский">Дилерский</option>
                </SelectFilter>
                <SelectFilter
                  value={accountStatusFilter}
                  onChange={(event) => setAccountStatusFilter(event.target.value as ClientJournalRow['accountStatus'] | 'all')}
                >
                  <option value="all">Статус счёта</option>
                  <option value="Открыт">Открыт</option>
                  <option value="Закрыт">Закрыт</option>
                </SelectFilter>
              </>
            }
            actions={
              <>
                <Button variant="secondary" size="sm" onClick={resetFilters} disabled={!hasActiveConditions}>
                  Сбросить фильтры
                </Button>
                <Button variant="secondary" size="sm" onClick={handleExport} disabled={sortedClientJournalRows.length === 0 || isLoading || Boolean(error)}>
                  Экспорт
                </Button>
              </>
            }
          />

          <DataTable
            rows={sortedClientJournalRows}
            emptyMessage="По заданным фильтрам записи не найдены"
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            columns={[
              { key: 'clientCode', header: 'Код клиента', className: 'whitespace-nowrap', sortable: true },
              { key: 'contractKind', header: 'Вид договора', className: 'whitespace-nowrap', sortable: true },
              { key: 'clientName', header: 'Наименование клиента', className: 'min-w-[240px]', sortable: true },
              { key: 'inn', header: 'ИНН', className: 'whitespace-nowrap', sortable: true },
              {
                key: 'clientType',
                header: 'Тип клиента',
                className: 'whitespace-nowrap',
                sortable: true,
                render: (row) => <StatusBadge value={row.clientType} compact />,
              },
              { key: 'contractNumber', header: 'Номер договора', className: 'whitespace-nowrap', sortable: true },
              { key: 'contractDate', header: 'Дата договора', className: 'whitespace-nowrap', sortable: true },
              {
                key: 'residencyStatus',
                header: 'Статус резидентства',
                className: 'whitespace-nowrap',
                sortable: true,
                render: (row) => <StatusBadge value={row.residencyStatus} compact />,
              },
              { key: 'accountType', header: 'Тип счёта', className: 'whitespace-nowrap', sortable: true },
              {
                key: 'accountStatus',
                header: 'Статус счёта',
                className: 'whitespace-nowrap',
                sortable: true,
                render: (row) => <StatusBadge value={row.accountStatus} compact />,
              },
            ]}
          />
        </section>
      </AsyncContent>
    </div>
  );
};
