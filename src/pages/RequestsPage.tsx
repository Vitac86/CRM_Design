import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDataAccess } from '../app/dataAccess/useDataAccess';
import { useClientsStore } from '../app/ClientsStore';
import { Button, DataTable, FilterBar, SearchInput, SelectFilter, Pagination, TableStatusText } from '../components/ui';
import type { ClientBankDetails, ClientContract, CurrencyCode, Request } from '../data/types';
import { buildDatedCsvFileName, exportToCsv } from '../utils/csv';

const pageSize = 10;

type RequestFormType = 'withdrawal' | 'transfer';
type TransferMarket = 'Валютный рынок' | 'Фондовый рынок';

const requestTypeLabelMap: Record<RequestFormType, string> = {
  withdrawal: 'Поручение на вывод ДС',
  transfer: 'Поручение на перевод ДС',
};

const requestStatusTone: Record<Request['status'], 'neutral' | 'warning' | 'danger'> = {
  'Ожидает': 'warning',
  'Принято': 'neutral',
  'Отклонено': 'danger',
};

const getOppositeMarket = (market: TransferMarket): TransferMarket =>
  market === 'Фондовый рынок' ? 'Валютный рынок' : 'Фондовый рынок';

const defaultManualBankDetails: ClientBankDetails = {
  bankName: '',
  bik: '',
  checkingAccount: '',
  correspondentAccount: '',
};

const requestCurrencyOptions: CurrencyCode[] = ['RUB', 'USD', 'EUR', 'CNY'];
const NEW_REQUEST_STATUS: Request['status'] = 'Ожидает';

const formatAmountByDigits = (rawValue: string): string => {
  const digits = rawValue.replace(/\D/g, '').slice(0, 15);
  if (!digits) {
    return '';
  }

  const normalized = digits.replace(/^0+(?=\d)/, '');
  const padded = normalized.padStart(3, '0');
  const integerPart = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const fractionPart = padded.slice(-2);

  return `${integerPart},${fractionPart}`;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const RequestsPage = () => {
  const { requests: requestsDataAccess, contracts: contractsDataAccess } = useDataAccess();
  const { clients, getClientById } = useClientsStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [requestsList, setRequestsList] = useState<Request[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [clientCodeFilter, setClientCodeFilter] = useState(() => searchParams.get('clientCode') ?? '');
  const [dateFilter, setDateFilter] = useState(() => searchParams.get('date') ?? '');
  const [sourceFilter, setSourceFilter] = useState<Request['source'] | 'all'>(() => {
    const source = searchParams.get('source');
    return source === 'Личный кабинет' || source === 'Почта' || source === 'Оригинал' ? source : 'all';
  });
  const [statusFilter, setStatusFilter] = useState<Request['status'] | 'all'>(() => {
    const status = searchParams.get('status');
    return status === 'Ожидает' || status === 'Принято' || status === 'Отклонено' ? status : 'all';
  });
  const [page, setPage] = useState(1);

  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [createType, setCreateType] = useState<RequestFormType>('withdrawal');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedContractId, setSelectedContractId] = useState('');
  const [selectedSource, setSelectedSource] = useState<Request['source']>('Личный кабинет');
  const [manualBankDetails, setManualBankDetails] = useState<ClientBankDetails>(defaultManualBankDetails);
  const [withdrawalBankSource, setWithdrawalBankSource] = useState<'client' | 'manual'>('client');
  const [transferFromMarket, setTransferFromMarket] = useState<TransferMarket>('Фондовый рынок');
  const [requestAmount, setRequestAmount] = useState('');
  const [requestCurrency, setRequestCurrency] = useState<CurrencyCode | ''>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [contractsByClientId, setContractsByClientId] = useState<Record<string, ClientContract[]>>({});

  const activeClients = useMemo(
    () => clients.filter((client) => client.subjectStatus === 'Активный клиент' && !client.isArchived),
    [clients],
  );

  const activeClientsWithBrokerContract = useMemo(
    () =>
      activeClients.filter((client) =>
        (contractsByClientId[client.id] ?? []).some((contract) => contract.type === 'broker' && contract.status === 'active'),
      ),
    [activeClients, contractsByClientId],
  );

  const clientOptions = createType === 'transfer' ? activeClientsWithBrokerContract : activeClients;

  const availableContracts = useMemo(() => {
    if (!selectedClientId) {
      return [];
    }

    return (contractsByClientId[selectedClientId] ?? []).filter(
      (contract) => contract.type === 'broker' && contract.status === 'active',
    );
  }, [selectedClientId, contractsByClientId]);
  const hasLoadedSelectedClientContracts = selectedClientId in contractsByClientId;

  const selectedClient = selectedClientId ? getClientById(selectedClientId) : undefined;
  const selectedContract = availableContracts.find((contract) => contract.id === selectedContractId);
  const selectedBankAccount = selectedClient?.bankAccounts?.[0];

  const sourceOptions = useMemo(
    () => [...new Set(requestsList.map((request) => request.source))],
    [requestsList],
  );

  const statusOptions = useMemo(
    () => [...new Set(requestsList.map((request) => request.status))],
    [requestsList],
  );

  const filteredRequests = useMemo(
    () =>
      requestsList.filter((request) => {
        const normalizedSearch = search.trim().toLowerCase();

        if (
          normalizedSearch.length > 0
          && !request.number.toLowerCase().includes(normalizedSearch)
          && !request.requestType.toLowerCase().includes(normalizedSearch)
          && !request.clientName.toLowerCase().includes(normalizedSearch)
          && !request.clientCode.toLowerCase().includes(normalizedSearch)
        ) {
          return false;
        }

        const normalizedClientCode = clientCodeFilter.trim().toLowerCase();
        if (normalizedClientCode.length > 0 && !request.clientCode.toLowerCase().includes(normalizedClientCode)) {
          return false;
        }

        if (dateFilter && request.date !== dateFilter) {
          return false;
        }

        if (sourceFilter !== 'all' && request.source !== sourceFilter) {
          return false;
        }

        if (statusFilter !== 'all' && request.status !== statusFilter) {
          return false;
        }

        return true;
      }),
    [requestsList, search, clientCodeFilter, dateFilter, sourceFilter, statusFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));

  const paginatedRequests = useMemo(
    () => filteredRequests.slice((page - 1) * pageSize, page * pageSize),
    [filteredRequests, page],
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages]);

  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (search.trim()) {
      nextParams.set('search', search.trim());
    }
    if (clientCodeFilter.trim()) {
      nextParams.set('clientCode', clientCodeFilter.trim());
    }
    if (dateFilter) {
      nextParams.set('date', dateFilter);
    }
    if (sourceFilter !== 'all') {
      nextParams.set('source', sourceFilter);
    }
    if (statusFilter !== 'all') {
      nextParams.set('status', statusFilter);
    }

    setSearchParams(nextParams, { replace: true });
  }, [search, clientCodeFilter, dateFilter, sourceFilter, statusFilter, setSearchParams]);

  useEffect(() => {
    setSelectedClientId('');
    setSelectedContractId('');
    setFormError(null);
  }, [createType]);

  useEffect(() => {
    setSelectedContractId('');
  }, [selectedClientId]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setToastMessage(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    let isCancelled = false;

    const loadRequests = async () => {
      setIsLoadingRequests(true);
      setRequestsError(null);

      try {
        const loadedRequests = await requestsDataAccess.listRequests();
        if (!isCancelled) {
          setRequestsList(loadedRequests);
        }
      } catch {
        if (!isCancelled) {
          setRequestsError('Не удалось загрузить список поручений.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingRequests(false);
        }
      }
    };

    void loadRequests();

    return () => {
      isCancelled = true;
    };
  }, [requestsDataAccess]);

  useEffect(() => {
    let isCancelled = false;
    const activeClientIds = activeClients.map((client) => client.id);
    const missingClientIds = activeClientIds.filter((clientId) => !(clientId in contractsByClientId));

    if (missingClientIds.length === 0) {
      return;
    }

    const loadContracts = async () => {
      const loadedContractsByClientId = await Promise.all(
        missingClientIds.map(async (clientId) => [clientId, await contractsDataAccess.listContractsByClientId(clientId)] as const),
      );

      if (isCancelled) {
        return;
      }

      setContractsByClientId((prev) => {
        const next = { ...prev };

        loadedContractsByClientId.forEach(([clientId, contracts]) => {
          if (!(clientId in next)) {
            next[clientId] = contracts;
          }
        });

        return next;
      });
    };

    void loadContracts();

    return () => {
      isCancelled = true;
    };
  }, [activeClients, contractsDataAccess, contractsByClientId]);

  const resetFilters = () => {
    setSearch('');
    setClientCodeFilter('');
    setDateFilter('');
    setSourceFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  const resetCreateForm = () => {
    setCreateType('withdrawal');
    setSelectedClientId('');
    setSelectedContractId('');
    setSelectedSource('Личный кабинет');
    setTransferFromMarket('Фондовый рынок');
    setWithdrawalBankSource('client');
    setManualBankDetails(defaultManualBankDetails);
    setRequestAmount('');
    setRequestCurrency('');
    setFormError(null);
  };

  const handleCreateRequest = async () => {
    if (!selectedClient || !selectedContract) {
      setFormError('Выберите клиента и договор для создания поручения.');
      return;
    }
    if (!requestAmount) {
      setFormError('Укажите сумму поручения в формате NNN NNN,NN.');
      return;
    }
    if (!requestCurrency) {
      setFormError('Выберите валюту поручения.');
      return;
    }

    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 5);

    const transferToMarket = getOppositeMarket(transferFromMarket);

    const withdrawalDetails: ClientBankDetails | undefined = createType === 'withdrawal'
      ? withdrawalBankSource === 'client' && selectedBankAccount
        ? {
            bankName: selectedBankAccount.bankName,
            bik: selectedBankAccount.bik,
            checkingAccount: selectedBankAccount.accountNumber,
            correspondentAccount: selectedBankAccount.correspondentAccount,
          }
        : {
            bankName: manualBankDetails.bankName.trim(),
            bik: manualBankDetails.bik.trim(),
            checkingAccount: manualBankDetails.checkingAccount.trim(),
            correspondentAccount: manualBankDetails.correspondentAccount.trim(),
          }
      : undefined;

    if (createType === 'withdrawal' && withdrawalDetails && Object.values(withdrawalDetails).some((value) => !value.trim())) {
      setFormError('Заполните банковские реквизиты для поручения на вывод ДС.');
      return;
    }

    setIsCreatingRequest(true);
    setFormError(null);

    try {
      const createdRequest = await requestsDataAccess.createRequest({
        clientId: selectedClient.id,
        requestType: requestTypeLabelMap[createType],
        requestTypeCode: createType,
        clientName: selectedClient.name,
        clientCode: selectedClient.code,
        contractId: selectedContract.id,
        contractNumber: selectedContract.number,
        status: NEW_REQUEST_STATUS,
        date,
        time,
        source: selectedSource,
        amount: requestAmount,
        currency: requestCurrency,
        withdrawalBankDetails: withdrawalDetails,
        transferFromMarket: createType === 'transfer' ? transferFromMarket : undefined,
        transferToMarket: createType === 'transfer' ? transferToMarket : undefined,
      });

      setRequestsList((prev) => [createdRequest, ...prev]);
      setIsCreateFormOpen(false);
      resetCreateForm();
      setToastMessage('Поручение успешно создано');
    } catch {
      setFormError('Не удалось создать поручение. Повторите попытку.');
    } finally {
      setIsCreatingRequest(false);
    }
  };

  const getDraftWithdrawalDetails = (): ClientBankDetails | undefined => {
    if (createType !== 'withdrawal') {
      return undefined;
    }

    if (withdrawalBankSource === 'client' && selectedBankAccount) {
      return {
        bankName: selectedBankAccount.bankName,
        bik: selectedBankAccount.bik,
        checkingAccount: selectedBankAccount.accountNumber,
        correspondentAccount: selectedBankAccount.correspondentAccount,
      };
    }

    return {
      bankName: manualBankDetails.bankName.trim(),
      bik: manualBankDetails.bik.trim(),
      checkingAccount: manualBankDetails.checkingAccount.trim(),
      correspondentAccount: manualBankDetails.correspondentAccount.trim(),
    };
  };

  const validateDraftForExport = (): string | null => {
    if (!selectedClient || !selectedContract) {
      return 'Для печати заполните обязательные поля: клиент и договор.';
    }
    if (!requestAmount || !requestCurrency) {
      return 'Для печати заполните обязательные поля: сумма и валюта.';
    }

    const withdrawalDetails = getDraftWithdrawalDetails();

    if (createType === 'withdrawal' && withdrawalDetails && Object.values(withdrawalDetails).some((value) => !value.trim())) {
      return 'Для печати поручения на вывод ДС заполните банковские реквизиты.';
    }

    return null;
  };

  const handlePrintDraft = () => {
    const validationError = validateDraftForExport();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    if (!selectedClient || !selectedContract) {
      return;
    }

    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 5);
    const transferToMarket = getOppositeMarket(transferFromMarket);
    const withdrawalDetails = getDraftWithdrawalDetails();

    const detailsRows = createType === 'withdrawal' && withdrawalDetails
      ? `
        <tr><td><strong>Банк</strong></td><td>${escapeHtml(withdrawalDetails.bankName)}</td></tr>
        <tr><td><strong>БИК</strong></td><td>${escapeHtml(withdrawalDetails.bik)}</td></tr>
        <tr><td><strong>Расчётный счёт</strong></td><td>${escapeHtml(withdrawalDetails.checkingAccount)}</td></tr>
        <tr><td><strong>Корреспондентский счёт</strong></td><td>${escapeHtml(withdrawalDetails.correspondentAccount)}</td></tr>
      `
      : `
        <tr><td><strong>Площадка списания</strong></td><td>${escapeHtml(transferFromMarket)}</td></tr>
        <tr><td><strong>Площадка зачисления</strong></td><td>${escapeHtml(transferToMarket)}</td></tr>
      `;

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!printWindow) {
      setFormError('Не удалось открыть окно печати. Разрешите всплывающие окна и повторите попытку.');
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8" />
        <title>Поручение — черновик</title>
        <style>
          body { font-family: Inter, Arial, sans-serif; color: #0f172a; margin: 24px; }
          h1 { margin: 0 0 12px; font-size: 20px; }
          p { margin: 0 0 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          td { border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; }
          td:first-child { width: 40%; background: #f8fafc; }
          .meta { margin-bottom: 12px; color: #475569; font-size: 13px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(requestTypeLabelMap[createType])}</h1>
        <p class="meta">Черновик от ${escapeHtml(date)} ${escapeHtml(time)}</p>
        <table>
          <tr><td><strong>Клиент</strong></td><td>${escapeHtml(selectedClient.name)} (${escapeHtml(selectedClient.code)})</td></tr>
          <tr><td><strong>Договор</strong></td><td>${escapeHtml(selectedContract.number)}</td></tr>
          <tr><td><strong>Статус</strong></td><td>Ожидает</td></tr>
          <tr><td><strong>Источник</strong></td><td>${escapeHtml(selectedSource)}</td></tr>
          <tr><td><strong>Сумма</strong></td><td>${escapeHtml(requestAmount)}</td></tr>
          <tr><td><strong>Валюта</strong></td><td>${escapeHtml(requestCurrency)}</td></tr>
          ${detailsRows}
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleExport = () => {
    const exported = exportToCsv(
      filteredRequests,
      [
        { header: 'Номер поручения', value: (request) => request.number },
        { header: 'Вид поручения', value: (request) => request.requestType },
        { header: 'Клиент', value: (request) => request.clientName },
        { header: 'Код клиента', value: (request) => request.clientCode },
        { header: 'Сумма', value: (request) => request.amount ?? '—' },
        { header: 'Валюта', value: (request) => request.currency ?? '—' },
        { header: 'Статус', value: (request) => request.status },
        { header: 'Дата', value: (request) => request.date },
        { header: 'Время', value: (request) => request.time },
        { header: 'Источник', value: (request) => request.source },
      ],
      buildDatedCsvFileName('requests'),
    );

    if (exported) {
      setToastMessage('CSV-экспорт выполнен');
    }
  };

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Поручения</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleExport} disabled={filteredRequests.length === 0}>
            Экспорт
          </Button>
          <Button
            onClick={() => {
              setIsCreateFormOpen((prev) => !prev);
              if (isCreateFormOpen) {
                resetCreateForm();
              }
            }}
          >
            {isCreateFormOpen ? 'Закрыть форму' : '+ Новое поручение'}
          </Button>
        </div>
      </header>

      {toastMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{toastMessage}</div>
      ) : null}
      {requestsError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{requestsError}</div>
      ) : null}

      {isCreateFormOpen ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {formError ? <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div> : null}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Тип поручения</span>
              <select
                value={createType}
                onChange={(event) => setCreateType(event.target.value as RequestFormType)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
              >
                <option value="withdrawal">Поручение на вывод ДС</option>
                <option value="transfer">Поручение на перевод ДС</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Клиент</span>
              <select
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
              >
                <option value="">Выберите клиента</option>
                {clientOptions.map((client) => (
                  <option key={client.id} value={client.id}>{client.name} ({client.code})</option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Договор</span>
              <select
                value={selectedContractId}
                onChange={(event) => setSelectedContractId(event.target.value)}
                disabled={!selectedClientId || availableContracts.length === 0}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 disabled:bg-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
              >
                <option value="">Выберите договор</option>
                {availableContracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>{contract.number}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Статус</span>
              <input value="Ожидает" disabled className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-600" />
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Источник</span>
              <select
                value={selectedSource}
                onChange={(event) => setSelectedSource(event.target.value as Request['source'])}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
              >
                <option value="Личный кабинет">Личный кабинет</option>
                <option value="Почта">Почта</option>
                <option value="Оригинал">Оригинал</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Сумма *</span>
              <input
                inputMode="decimal"
                placeholder="0,00"
                value={requestAmount}
                onChange={(event) => setRequestAmount(formatAmountByDigits(event.target.value))}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Валюта *</span>
              <select
                value={requestCurrency}
                onChange={(event) => setRequestCurrency(event.target.value as CurrencyCode | '')}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
              >
                <option value="">Выберите валюту</option>
                {requestCurrencyOptions.map((currency) => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </label>
          </div>

          {selectedClientId && hasLoadedSelectedClientContracts && availableContracts.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Для выбранного клиента нет активного брокерского договора.
            </div>
          ) : null}

          {createType === 'withdrawal' && selectedContract ? (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-800">Банковские реквизиты клиента</p>
              {selectedBankAccount ? (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="radio" checked={withdrawalBankSource === 'client'} onChange={() => setWithdrawalBankSource('client')} />
                    Использовать реквизиты клиента
                  </label>
                  <div className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700 md:grid-cols-2">
                    <p><span className="font-medium">Банк:</span> {selectedBankAccount.bankName}</p>
                    <p><span className="font-medium">БИК:</span> {selectedBankAccount.bik}</p>
                    <p><span className="font-medium">Р/с:</span> {selectedBankAccount.accountNumber}</p>
                    <p><span className="font-medium">К/с:</span> {selectedBankAccount.correspondentAccount}</p>
                  </div>
                </div>
              ) : (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  У клиента нет сохранённых банковских реквизитов. Введите реквизиты вручную.
                </p>
              )}

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" checked={withdrawalBankSource === 'manual'} onChange={() => setWithdrawalBankSource('manual')} />
                Ввести реквизиты вручную
              </label>

              {withdrawalBankSource === 'manual' || !selectedBankAccount ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    placeholder="Банк"
                    value={manualBankDetails.bankName}
                    onChange={(event) => setManualBankDetails((prev) => ({ ...prev, bankName: event.target.value }))}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                  />
                  <input
                    placeholder="БИК"
                    value={manualBankDetails.bik}
                    onChange={(event) => setManualBankDetails((prev) => ({ ...prev, bik: event.target.value }))}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                  />
                  <input
                    placeholder="Расчётный счёт"
                    value={manualBankDetails.checkingAccount}
                    onChange={(event) => setManualBankDetails((prev) => ({ ...prev, checkingAccount: event.target.value }))}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                  />
                  <input
                    placeholder="Корреспондентский счёт"
                    value={manualBankDetails.correspondentAccount}
                    onChange={(event) => setManualBankDetails((prev) => ({ ...prev, correspondentAccount: event.target.value }))}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {createType === 'transfer' && selectedContract ? (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-800">Площадки перевода</p>
              <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-end">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Площадка списания</span>
                  <select
                    value={transferFromMarket}
                    onChange={(event) => setTransferFromMarket(event.target.value as TransferMarket)}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                  >
                    <option value="Фондовый рынок">Фондовый рынок</option>
                    <option value="Валютный рынок">Валютный рынок</option>
                  </select>
                </label>
                <Button variant="secondary" onClick={() => setTransferFromMarket((prev) => getOppositeMarket(prev))}>↔︎</Button>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Площадка зачисления</span>
                  <input
                    value={getOppositeMarket(transferFromMarket)}
                    disabled
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700"
                  />
                </label>
              </div>
            </div>
          ) : null}

          {clientOptions.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Нет клиентов, подходящих под выбранный тип поручения.
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateFormOpen(false);
                resetCreateForm();
              }}
            >
              Отмена
            </Button>
            <Button variant="secondary" onClick={handlePrintDraft}>
              Распечатать поручение
            </Button>
            <Button onClick={() => void handleCreateRequest()} disabled={isCreatingRequest}>
              {isCreatingRequest ? 'Сохранение...' : 'Сохранить поручение'}
            </Button>
          </div>
        </div>
      ) : null}

      <FilterBar className="flex-col items-stretch gap-3">
        <div className="flex w-full flex-wrap gap-3">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="По номеру, виду поручения, клиенту или коду"
            className="w-full md:w-[520px]"
            aria-label="Поиск по номеру, виду поручения, клиенту или коду"
          />
        </div>

        <div className="flex w-full flex-wrap items-end gap-3">
          <input
            type="text"
            value={clientCodeFilter}
            onChange={(event) => setClientCodeFilter(event.target.value)}
            placeholder="По коду клиента"
            aria-label="Фильтр по коду клиента"
            className="h-10 min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition hover:border-slate-300 focus:border-brand focus:ring-2 focus:ring-brand/10"
          />

          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            aria-label="Фильтр по дате"
            className="h-10 min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-brand focus:ring-2 focus:ring-brand/10"
          />

          <SelectFilter value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as Request['source'] | 'all')}>
            <option value="all">Источник</option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </SelectFilter>

          <SelectFilter value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as Request['status'] | 'all')}>
            <option value="all">Статус</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status === NEW_REQUEST_STATUS ? 'Ожидает (новые)' : status}
              </option>
            ))}
          </SelectFilter>

          <Button variant="secondary" className="ml-auto" onClick={resetFilters}>
            Очистить фильтры
          </Button>
        </div>
      </FilterBar>

      <DataTable<Request>
        columns={[
          { key: 'number', header: 'Номер поручения', className: 'font-medium text-slate-800 whitespace-nowrap' },
          { key: 'requestType', header: 'Вид поручения', className: 'min-w-[220px]' },
          { key: 'clientName', header: 'Клиент', className: 'min-w-[260px]' },
          { key: 'clientCode', header: 'Код клиента', className: 'whitespace-nowrap' },
          { key: 'amount', header: 'Сумма', render: (request) => request.amount ?? '—', className: 'whitespace-nowrap' },
          { key: 'currency', header: 'Валюта', render: (request) => request.currency ?? '—', className: 'whitespace-nowrap' },
          {
            key: 'status',
            header: 'Статус',
            render: (request) => <TableStatusText tone={requestStatusTone[request.status]}>{request.status}</TableStatusText>,
          },
          { key: 'date', header: 'Дата', className: 'whitespace-nowrap' },
          { key: 'time', header: 'Время', className: 'whitespace-nowrap' },
          { key: 'source', header: 'Источник' },
        ]}
        rows={paginatedRequests}
        emptyMessage={isLoadingRequests ? 'Загрузка поручений...' : 'По выбранным фильтрам поручений нет'}
      />

      <div className="flex justify-end">
        <Pagination
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
          onNext={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
        />
      </div>
    </div>
  );
};
