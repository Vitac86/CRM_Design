import { useEffect, useMemo, useState } from 'react';
import { MiddleOfficeReportDetails } from '../components/crm/MiddleOfficeReportDetails';
import { MiddleOfficeReportList } from '../components/crm/MiddleOfficeReportList';
import { useClientsStore } from '../app/ClientsStore';
import { clientAccounts } from '../data/clientAccounts';
import { clientContracts } from '../data/clientContracts';
import { reports } from '../data/reports';
import type { ClientContract, ContractProductType, Report } from '../data/types';
import { Button, DataTable, SearchInput, SelectFilter, Tabs } from '../components/ui';

type MiddleOfficeSection = 'clients-journal' | 'reports-journal';

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

const tabs = [
  { value: 'clients-journal', label: 'Журнал клиентов' },
  { value: 'reports-journal', label: 'Журнал отправленных отчётов' },
] as const;

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

const getAccountStatus = (contract: ClientContract): 'активный' | 'закрытый' => (contract.status === 'active' ? 'активный' : 'закрытый');

export const MiddleOfficePage = () => {
  const { clients } = useClientsStore();

  const [section, setSection] = useState<MiddleOfficeSection>('reports-journal');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Report['deliveryStatus'] | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<Extract<Report['deliveryChannel'], 'E-mail' | 'Личный кабинет'> | 'all'>('all');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [clientSearch, setClientSearch] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState<ClientJournalRow['clientType'] | 'all'>('all');
  const [contractKindFilter, setContractKindFilter] = useState<ClientJournalRow['contractKind'] | 'all'>('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState<ClientJournalRow['accountStatus'] | 'all'>('all');

  const middleOfficeReports = useMemo(() => reports.filter((report) => report.department === 'Мидл-офис'), []);

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

  const filteredReports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return middleOfficeReports.filter((report) => {
      if (normalizedSearch) {
        const searchHit =
          report.clientName.toLowerCase().includes(normalizedSearch) ||
          report.clientCode.toLowerCase().includes(normalizedSearch) ||
          report.reportTitle.toLowerCase().includes(normalizedSearch) ||
          report.fileName.toLowerCase().includes(normalizedSearch);

        if (!searchHit) {
          return false;
        }
      }

      if (statusFilter !== 'all' && report.deliveryStatus !== statusFilter) {
        return false;
      }

      if (channelFilter !== 'all' && report.deliveryChannel !== channelFilter) {
        return false;
      }

      return true;
    });
  }, [channelFilter, middleOfficeReports, search, statusFilter]);

  useEffect(() => {
    if (filteredReports.length === 0) {
      setSelectedReportId(null);
      return;
    }

    const selectedReportExists = filteredReports.some((report) => report.id === selectedReportId);

    if (!selectedReportExists) {
      setSelectedReportId(filteredReports[0].id);
    }
  }, [filteredReports, selectedReportId]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setToastMessage(null), 2400);

    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const selectedReport = filteredReports.find((report) => report.id === selectedReportId) ?? null;

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Мидл-офис</h1>
        <Button variant="secondary">Экспорт</Button>
      </header>

      <Tabs items={[...tabs]} value={section} onChange={(value) => setSection(value as MiddleOfficeSection)} />

      {section === 'clients-journal' ? (
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
      ) : (
        <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-3">
            <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
              <SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск по клиенту или отчёту..."
                className="sm:flex-1"
              />
              <SelectFilter
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as Report['deliveryStatus'] | 'all')}
                className="sm:w-[170px]"
              >
                <option value="all">Статус: Все</option>
                <option value="Доставлен">Доставлен</option>
                <option value="Ожидает">Ожидает</option>
                <option value="Ошибка">Ошибка</option>
              </SelectFilter>
              <SelectFilter
                value={channelFilter}
                onChange={(event) =>
                  setChannelFilter(event.target.value as Extract<Report['deliveryChannel'], 'E-mail' | 'Личный кабинет'> | 'all')
                }
                className="sm:w-[190px]"
              >
                <option value="all">Канал: Все</option>
                <option value="E-mail">E-mail</option>
                <option value="Личный кабинет">Личный кабинет</option>
              </SelectFilter>
            </div>

            <MiddleOfficeReportList reports={filteredReports} selectedReportId={selectedReportId} onSelect={setSelectedReportId} />
          </div>

          <MiddleOfficeReportDetails
            report={selectedReport}
            onResend={() => setToastMessage('Отчёт отправлен повторно')}
            onDownload={() => setToastMessage('Файл подготовлен к скачиванию')}
          />
        </section>
      )}

      {toastMessage && (
        <div className="fixed right-6 bottom-6 z-50 rounded-md bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">{toastMessage}</div>
      )}
    </div>
  );
};
