import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataAccess } from '../../app/dataAccess/useDataAccess';
import type { ClientAccount, ContractProductType, ClientContract } from '../../data/types';
import { Badge, Button, Card, DataTable } from '../ui';

type SubjectContractsTabProps = {
  clientId: string;
};

type AccountForm = {
  number: string;
  type: ContractProductType;
  openDate: string;
};

const productTypeLabelMap: Record<ContractProductType, string> = {
  broker: 'Брокерский',
  depository: 'Депозитарный',
  trust: 'Доверительное управление',
  iis: 'ИИС',
  other: 'Иной',
};

const statusLabelMap: Record<ClientContract['status'], string> = {
  active: 'Действующий',
  closed: 'Закрытый',
};

const statusVariantMap: Record<ClientContract['status'], 'success' | 'danger'> = {
  active: 'success',
  closed: 'danger',
};

const defaultAccountForm: AccountForm = {
  number: '',
  type: 'broker',
  openDate: '',
};

export const SubjectContractsTab = ({ clientId }: SubjectContractsTabProps) => {
  const navigate = useNavigate();
  const { contracts: contractsRepository, accounts: accountsRepository } = useDataAccess();
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);

  const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
  const [accountForm, setAccountForm] = useState<AccountForm>(defaultAccountForm);
  const [accountError, setAccountError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const [nextContracts, nextAccounts] = await Promise.all([
        contractsRepository.listContractsByClientId(clientId),
        accountsRepository.listAccountsByClientId(clientId),
      ]);

      if (isMounted) {
        setContracts(nextContracts);
        setAccounts(nextAccounts);
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [accountsRepository, clientId, contractsRepository]);

  const handleOpenContract = (contractId: string) => {
    navigate(`/subjects/${clientId}/contract-wizard?contractId=${contractId}`);
  };

  const handleCreateAccount = async () => {
    if (!accountForm.number.trim() || !accountForm.openDate) {
      setAccountError('Заполните номер счёта и дату открытия.');
      return;
    }

    const newAccount = await accountsRepository.createAccount({
      clientId,
      number: accountForm.number,
      type: accountForm.type,
      openDate: accountForm.openDate,
    });

    setAccounts((prev) => [newAccount, ...prev]);
    setAccountForm(defaultAccountForm);
    setAccountError(null);
    setIsAccountFormOpen(false);
  };

  return (
    <Card className="space-y-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Договоры</h2>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/subjects/${clientId}/contract-wizard`)}>
            + Добавить договор
          </Button>
        </div>

        <DataTable
          columns={[
            {
              key: 'number',
              header: 'Номер договора',
              className: 'min-w-[180px] font-medium text-slate-800',
              render: (row) => (
                <button
                  type="button"
                  className="cursor-pointer text-left text-brand-dark hover:underline"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleOpenContract(row.id);
                  }}
                >
                  {row.number}
                </button>
              ),
            },
            {
              key: 'type',
              header: 'Вид договора',
              className: 'min-w-[190px]',
              render: (row) => productTypeLabelMap[row.type],
            },
            { key: 'openDate', header: 'Дата открытия', className: 'min-w-[140px]' },
            {
              key: 'closeDate',
              header: 'Дата закрытия',
              className: 'min-w-[140px]',
              render: (row) => row.closeDate || '—',
            },
            {
              key: 'status',
              header: 'Статус',
              className: 'min-w-[170px]',
              render: (row) => <Badge variant={statusVariantMap[row.status]}>{statusLabelMap[row.status]}</Badge>,
            },
          ]}
          rows={contracts}
          onRowClick={(row) => handleOpenContract(row.id)}
          emptyMessage="Для субъекта пока нет договоров"
        />
      </section>

      <div className="border-t border-slate-100" />

      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Счета</h2>
          <Button variant="secondary" size="sm" onClick={() => setIsAccountFormOpen(true)}>
            + Добавить счёт
          </Button>
        </div>

        {isAccountFormOpen ? (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            {accountError ? <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{accountError}</div> : null}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Номер счёта</span>
                <input
                  value={accountForm.number}
                  onChange={(event) => setAccountForm((prev) => ({ ...prev, number: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Вид счёта</span>
                <select
                  value={accountForm.type}
                  onChange={(event) => setAccountForm((prev) => ({ ...prev, type: event.target.value as ContractProductType }))}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                >
                  {Object.entries(productTypeLabelMap).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Дата открытия</span>
                <input
                  type="date"
                  value={accountForm.openDate}
                  onChange={(event) => setAccountForm((prev) => ({ ...prev, openDate: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setAccountForm(defaultAccountForm);
                  setAccountError(null);
                  setIsAccountFormOpen(false);
                }}
              >
                Отмена
              </Button>
              <Button size="sm" onClick={() => void handleCreateAccount()}>
                Сохранить
              </Button>
            </div>
          </div>
        ) : null}

        <DataTable
          columns={[
            { key: 'number', header: 'Номер счёта', className: 'min-w-[220px] font-medium text-slate-800' },
            {
              key: 'type',
              header: 'Вид счёта',
              className: 'min-w-[220px]',
              render: (row) => productTypeLabelMap[row.type],
            },
            { key: 'openDate', header: 'Дата открытия', className: 'min-w-[140px]' },
          ]}
          rows={accounts}
          emptyMessage="Для субъекта пока нет счетов"
        />
      </section>
    </Card>
  );
};
