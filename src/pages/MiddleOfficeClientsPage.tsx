import { useMemo, useState } from 'react';
import { useClientsStore } from '../app/ClientsStore';
import { clientAccounts } from '../data/clientAccounts';
import { clientContracts } from '../data/clientContracts';
import type { ClientContract, ContractProductType } from '../data/types';
import { Button, DataTable, SearchInput, SelectFilter } from '../components/ui';

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

const formatDate = (value: string) => {
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
            onChange={(event) => setClientTypeFilter(event.target.value as ClientJournalRow['clientType'] | 'all')}
            className="sm:w-[150px]"
          >
            <option value="all">Тип клиента: Все</option>
            <option value="ф/л">ф/л</option>
            <option value="ю/л">ю/л</option>
          </SelectFilter>
          <SelectFilter
            value={contractKindFilter}
            onChange={(event) => setContractKindFilter(event.target.value as ClientJournalRow['contractKind'] | 'all')}
            className="sm:w-[150px]"
          >
            <option value="all">Вид договора: Все</option>
            <option value="БО">БО</option>
            <option value="ДУ">ДУ</option>
          </SelectFilter>
          <SelectFilter
            value={accountStatusFilter}
            onChange={(event) => setAccountStatusFilter(event.target.value as ClientJournalRow['accountStatus'] | 'all')}
            className="sm:w-[170px]"
          >
            <option value="all">Статус счёта: Все</option>
            <option value="активный">активный</option>
            <option value="закрытый">закрытый</option>
          </SelectFilter>
        </div>

        <DataTable
          rows={filteredClientJournalRows}
          emptyMessage="По заданным фильтрам записи не найдены"
          columns={[
            { key: 'clientCode', header: 'Код клиента', className: 'whitespace-nowrap' },
            { key: 'contractKind', header: 'Вид договора', className: 'whitespace-nowrap' },
            { key: 'clientName', header: 'Наименование клиента', className: 'min-w-[240px]' },
            { key: 'inn', header: 'ИНН', className: 'whitespace-nowrap' },
            { key: 'clientType', header: 'Тип клиента', className: 'whitespace-nowrap' },
            { key: 'contractNumber', header: 'Номер договора', className: 'whitespace-nowrap' },
            { key: 'contractDate', header: 'Дата договора', className: 'whitespace-nowrap' },
            { key: 'residencyStatus', header: 'Статус резидентства', className: 'whitespace-nowrap' },
            { key: 'accountType', header: 'Тип счёта', className: 'whitespace-nowrap' },
            { key: 'accountStatus', header: 'Статус счёта', className: 'whitespace-nowrap' },
          ]}
        />
      </section>
    </div>
  );
};
