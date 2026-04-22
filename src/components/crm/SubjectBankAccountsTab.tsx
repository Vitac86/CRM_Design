import { useMemo, useState } from 'react';
import type { BankAccount, BankAccountStatus, Client } from '../../data/types';
import { Badge, Button } from '../ui';

type SubjectBankAccountsTabProps = {
  client: Client;
  onAddAccount?: (account: BankAccount) => void;
};

type NewAccountForm = Omit<BankAccount, 'id'>;

const statusVariantMap: Record<BankAccountStatus, 'success' | 'warning' | 'neutral'> = {
  Активен: 'success',
  'На проверке': 'warning',
  Закрыт: 'neutral',
};

const defaultFormState: NewAccountForm = {
  bankName: '',
  bik: '',
  accountNumber: '',
  correspondentAccount: '',
  currency: 'RUB',
  purpose: '',
  status: 'Активен',
  openedAt: '',
};

export const SubjectBankAccountsTab = ({ client, onAddAccount }: SubjectBankAccountsTabProps) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [formData, setFormData] = useState<NewAccountForm>(defaultFormState);
  const accounts = useMemo(() => client.bankAccounts ?? [], [client.bankAccounts]);

  const handleCancel = () => {
    setShowAddForm(false);
    setValidationError(null);
    setFormData(defaultFormState);
  };

  const handleSubmit = () => {
    if (!formData.bankName.trim() || !formData.bik.trim() || !formData.accountNumber.trim() || !formData.correspondentAccount.trim()) {
      setValidationError('Заполните обязательные поля');
      return;
    }

    onAddAccount?.({
      ...formData,
      id: `ba-${Date.now()}`,
      openedAt: formData.openedAt || new Date().toISOString().slice(0, 10),
      purpose: formData.purpose.trim() || 'Без назначения',
    });

    handleCancel();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Банковские реквизиты</h2>
          <p className="text-sm text-slate-600">Расчётные и специальные счета клиента</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowAddForm(true)}>
          + Добавить счёт
        </Button>
      </div>

      {showAddForm ? (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Новый счёт</h3>

          {validationError ? <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{validationError}</div> : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Наименование банка *</span>
              <input
                value={formData.bankName}
                onChange={(event) => setFormData((prev) => ({ ...prev, bankName: event.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">БИК *</span>
              <input
                value={formData.bik}
                onChange={(event) => setFormData((prev) => ({ ...prev, bik: event.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Валюта *</span>
              <select
                value={formData.currency}
                onChange={(event) => setFormData((prev) => ({ ...prev, currency: event.target.value as NewAccountForm['currency'] }))}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
              >
                <option value="RUB">RUB</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="CNY">CNY</option>
              </select>
            </label>
            <label className="space-y-1 md:col-span-2 xl:col-span-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Расчётный счёт *</span>
              <input
                value={formData.accountNumber}
                onChange={(event) => setFormData((prev) => ({ ...prev, accountNumber: event.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
              />
            </label>
            <label className="space-y-1 md:col-span-2 xl:col-span-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Корреспондентский счёт *</span>
              <input
                value={formData.correspondentAccount}
                onChange={(event) => setFormData((prev) => ({ ...prev, correspondentAccount: event.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Статус</span>
              <select
                value={formData.status}
                onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value as BankAccountStatus }))}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
              >
                <option value="Активен">Активен</option>
                <option value="На проверке">На проверке</option>
                <option value="Закрыт">Закрыт</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Дата открытия</span>
              <input
                type="date"
                value={formData.openedAt}
                onChange={(event) => setFormData((prev) => ({ ...prev, openedAt: event.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
              />
            </label>
            <label className="space-y-1 md:col-span-2 xl:col-span-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Назначение</span>
              <input
                value={formData.purpose}
                onChange={(event) => setFormData((prev) => ({ ...prev, purpose: event.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={handleCancel}>
              Отмена
            </Button>
            <Button size="sm" onClick={handleSubmit}>
              Добавить
            </Button>
          </div>
        </div>
      ) : null}

      {accounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Банковские счета не добавлены</h3>
          <p className="mt-1 text-sm text-slate-600">Добавьте первый счёт клиента для отображения реквизитов.</p>
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={() => setShowAddForm(true)}>
              + Добавить счёт
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {accounts.map((account) => (
            <article key={account.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{account.bankName}</h3>
                  <p className="text-sm text-slate-600">{account.purpose}</p>
                </div>
                <Badge variant={statusVariantMap[account.status]}>{account.status}</Badge>
              </div>
              <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-slate-500">БИК</dt>
                  <dd className="font-mono text-slate-900">{account.bik}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Валюта</dt>
                  <dd className="text-slate-900">{account.currency}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Расчётный счёт</dt>
                  <dd className="font-mono text-slate-900">{account.accountNumber}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Дата открытия</dt>
                  <dd className="text-slate-900">{account.openedAt}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-slate-500">Корреспондентский счёт</dt>
                  <dd className="font-mono text-slate-900">{account.correspondentAccount}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
