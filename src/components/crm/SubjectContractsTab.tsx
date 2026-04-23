import { useState } from 'react';
import { getAccountsByClientId } from '../../data/clientAccounts';
import { getContractsByClientId } from '../../data/clientContracts';
import type { ClientAccount, ClientContract, ContractProductType } from '../../data/types';
import { Badge, Button, Card, DataTable } from '../ui';

type SubjectContractsTabProps = {
  clientId: string;
};

type ContractForm = {
  number: string;
  type: ContractProductType;
  openDate: string;
  closeDate: string;
  status: ClientContract['status'];
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

const defaultContractForm: ContractForm = {
  number: '',
  type: 'broker',
  openDate: '',
  closeDate: '',
  status: 'active',
};

const defaultAccountForm: AccountForm = {
  number: '',
  type: 'broker',
  openDate: '',
};

export const SubjectContractsTab = ({ clientId }: SubjectContractsTabProps) => {
  const [contracts, setContracts] = useState<ClientContract[]>(() => getContractsByClientId(clientId));
  const [accounts, setAccounts] = useState<ClientAccount[]>(() => getAccountsByClientId(clientId));

  const [isContractFormOpen, setIsContractFormOpen] = useState(false);
  const [contractForm, setContractForm] = useState<ContractForm>(defaultContractForm);
  const [contractError, setContractError] = useState<string | null>(null);

  const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
  const [accountForm, setAccountForm] = useState<AccountForm>(defaultAccountForm);
  const [accountError, setAccountError] = useState<string | null>(null);

  const handleCreateContract = () => {
    if (!contractForm.number.trim() || !contractForm.openDate) {
      setContractError('Заполните номер договора и дату открытия.');
      return;
    }

    if (contractForm.status === 'closed' && !contractForm.closeDate) {
      setContractError('Для закрытого договора укажите дату закрытия.');
      return;
    }

    const newContract: ClientContract = {
      id: `ctr-${Date.now()}`,
      clientId,
      number: contractForm.number.trim(),
      type: contractForm.type,
      openDate: contractForm.openDate,
      closeDate: contractForm.status === 'active' ? null : contractForm.closeDate || null,
      status: contractForm.status,
    };

    setContracts((prev) => [newContract, ...prev]);
    setContractForm(defaultContractForm);
    setContractError(null);
    setIsContractFormOpen(false);
  };

  const handleCreateAccount = () => {
    if (!accountForm.number.trim() || !accountForm.openDate) {
      setAccountError('Заполните номер счёта и дату открытия.');
      return;
    }

    const newAccount: ClientAccount = {
      id: `acc-${Date.now()}`,
      clientId,
      number: accountForm.number.trim(),
      type: accountForm.type,
      openDate: accountForm.openDate,
    };

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
          <Button variant="secondary" size="sm" onClick={() => setIsContractFormOpen(true)}>
            + Добавить договор
          </Button>
        </div>

        {isContractFormOpen ? (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            {contractError ? <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{contractError}</div> : null}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Номер договора</span>
                <input
                  value={contractForm.number}
                  onChange={(event) => setContractForm((prev) => ({ ...prev, number: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Вид договора</span>
                <select
                  value={contractForm.type}
                  onChange={(event) => setContractForm((prev) => ({ ...prev, type: event.target.value as ContractProductType }))}
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
                  value={contractForm.openDate}
                  onChange={(event) => setContractForm((prev) => ({ ...prev, openDate: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Дата закрытия</span>
                <input
                  type="date"
                  value={contractForm.closeDate}
                  onChange={(event) => setContractForm((prev) => ({ ...prev, closeDate: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Статус</span>
                <select
                  value={contractForm.status}
                  onChange={(event) =>
                    setContractForm((prev) => ({
                      ...prev,
                      status: event.target.value as ClientContract['status'],
                      closeDate: event.target.value === 'active' ? '' : prev.closeDate,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                >
                  <option value="active">Действующий</option>
                  <option value="closed">Закрытый</option>
                </select>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setContractForm(defaultContractForm);
                  setContractError(null);
                  setIsContractFormOpen(false);
                }}
              >
                Отмена
              </Button>
              <Button size="sm" onClick={handleCreateContract}>
                Сохранить
              </Button>
            </div>
          </div>
        ) : null}

        <DataTable
          columns={[
            { key: 'number', header: 'Номер договора', className: 'min-w-[180px] font-medium text-slate-800' },
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
              <Button size="sm" onClick={handleCreateAccount}>
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
