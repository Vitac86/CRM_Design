import { useMemo, useState } from 'react';
import { useClientsStore } from '../app/ClientsStore';
import { clientAccounts } from '../data/clientAccounts';
import { clientContracts } from '../data/clientContracts';
import type { ClientContract, ContractProductType } from '../data/types';
import { Button, DataTable, SearchInput, SelectFilter, type SortDirection } from '../components/ui';

type ClientJournalRow = {
  id: string;
  clientCode: string;
  contractKind: 'БО' | 'ДУ';
  clientName: string;
  inn: string;
  clientType: 'ф/л' | 'ю/л';
  contractNumber: string;
  contractDate: string;
  residencyStatus: string;
  accountType: 'обычный' | 'ИИС' | 'ИН';
  accountStatus: 'активный' | 'закрытый';
};

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

const normalizeContractKind = (value: string): ClientJournalRow['contractKind'] | null => {
  const normalizedValue = value.trim().toUpperCase();
  if (normalizedValue === 'БО' || normalizedValue === 'ДУ') {
    return normalizedValue;
  }

  return null;
};

const normalizeClientType = (value: string): ClientJournalRow['clientType'] | null => {
  const normalizedValue = value.trim().toLowerCase();
  if (normalizedValue === 'ф/л' || normalizedValue === 'ю/л') {
    return normalizedValue;
  }

  return null;
};

const normalizeAccountStatus = (value: string): ClientJournalRow['accountStatus'] | null => {
  const normalizedValue = value.trim().toLowerCase();
  if (normalizedValue === 'активный' || normalizedValue === 'закрытый') {
    return normalizedValue;
  }

  return null;
};

const formatDate = (value: string): string => {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}`;
};

const mapContractKind = (contractType: ContractProductType): 'БО' | 'ДУ' => (contractType === 'trust' ? 'ДУ' : 'БО');

const mapClientType = (type: string): 'ф/л' | 'ю/л' => (type === 'ФЛ' || type === 'ИП' ? 'ф/л' : 'ю/л');

const mapAccountType = (type: ContractProductType): 'обычный' | 'ИИС' | 'ИН' => {
  if (type === 'iis') {
    return 'ИИС';
  }

  if (type === 'other') {
    return 'ИН';
  }

  return 'обычный';
};

const getAccountStatus = (contract: ClientContract): 'активный' | 'закрытый' =>
  contract.status === 'active' ? 'активный' : 'закрытый';

export const MiddleOfficeClientsPage = () => {
  const { clients } = useClientsStore();

  const [clientSearch, setClientSearch] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState<ClientJournalRow['clientType'] | 'all'>('all');
  const [contractKindFilter, setContractKindFilter] = useState<ClientJournalRow['contractKind'] | 'all'>('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState<ClientJournalRow['accountStatus'] | 'all'>('all');
  const [sortKey, setSortKey] = useState<ClientJournalSortKey>('clientCode');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const clientJournalRows = useMemo<ClientJournalRow[]>(() => {
    const activeClients = clients.filter((client) => !client.isArchived);

    return activeClients.flatMap((client) => {
      const contracts = clientContracts.filter((contract) => contract.clientId === client.id);

      return contracts.map((contract) => {
        const matchedAccount =
          clientAccounts.find(
            (account) =>
              account.clientId === client.id && account.type === contract.type && account.openDate === contract.openDate,
          ) ?? clientAccounts.find((account) => account.clientId === client.id && account.type === contract.type);

        return {
          id: `${client.id}-${contract.id}`,
          clientCode: client.code,
          contractKind: mapContractKind(contract.type),
          clientName: client.name,
          inn: client.inn,
          clientType: mapClientType(client.type),
          contractNumber: contract.number,
          contractDate: formatDate(contract.openDate),
          residencyStatus: client.residency,
          accountType: matchedAccount ? mapAccountType(matchedAccount.type) : mapAccountType(contract.type),
          accountStatus: getAccountStatus(contract),
        };
      });
    });
  }, [clients]);

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

      return String(leftRow[sortKey]).localeCompare(String(rightRow[sortKey]), 'ru', {
        numeric: true,
        sensitivity: 'base',
      }) * direction;
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

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Мидл-офис — Журнал клиентов</h1>
        <Button variant="secondary">Экспорт</Button>
      </header>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
          <SearchInput
            value={clientSearch}
            onChange={(event) => setClientSearch(event.target.value)}
            placeholder="Поиск по коду, клиенту, ИНН или договору..."
            className="sm:flex-1"
          />
          <SelectFilter
            value={clientTypeFilter}
            onChange={(event) => {
              const nextValue = event.target.value;
              setClientTypeFilter(nextValue === 'all' ? 'all' : (normalizeClientType(nextValue) ?? 'all'));
            }}
            className="sm:w-[150px]"
          >
            <option value="all">Тип клиента: Все</option>
            <option value="ф/л">ф/л</option>
            <option value="ю/л">ю/л</option>
          </SelectFilter>
          <SelectFilter
            value={contractKindFilter}
            onChange={(event) => {
              const nextValue = event.target.value;
              setContractKindFilter(nextValue === 'all' ? 'all' : (normalizeContractKind(nextValue) ?? 'all'));
            }}
            className="sm:w-[150px]"
          >
            <option value="all">Вид договора: Все</option>
            <option value="БО">БО</option>
            <option value="ДУ">ДУ</option>
          </SelectFilter>
          <SelectFilter
            value={accountStatusFilter}
            onChange={(event) => {
              const nextValue = event.target.value;
              setAccountStatusFilter(nextValue === 'all' ? 'all' : (normalizeAccountStatus(nextValue) ?? 'all'));
            }}
            className="sm:w-[170px]"
          >
            <option value="all">Статус счёта: Все</option>
            <option value="активный">активный</option>
            <option value="закрытый">закрытый</option>
          </SelectFilter>
          <Button variant="secondary" size="sm" onClick={resetFilters} className="sm:ml-auto" disabled={!hasActiveConditions}>
            Сбросить фильтры
          </Button>
        </div>

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
            { key: 'clientType', header: 'Тип клиента', className: 'whitespace-nowrap', sortable: true },
            { key: 'contractNumber', header: 'Номер договора', className: 'whitespace-nowrap', sortable: true },
            { key: 'contractDate', header: 'Дата договора', className: 'whitespace-nowrap', sortable: true },
            { key: 'residencyStatus', header: 'Статус резидентства', className: 'whitespace-nowrap', sortable: true },
            { key: 'accountType', header: 'Тип счёта', className: 'whitespace-nowrap', sortable: true },
            { key: 'accountStatus', header: 'Статус счёта', className: 'whitespace-nowrap', sortable: true },
          ]}
        />
      </section>
    </div>
  );
};
