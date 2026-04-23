import { useMemo, useState } from 'react';
import { Button, Card } from '../../ui';
import type { BankAccount } from '../../../data/types';
import { RegistrationCheckboxGroup } from './RegistrationCheckboxGroup';
import { RegistrationTextField } from './RegistrationTextField';

type DraftBankAccount = Omit<BankAccount, 'id' | 'status'>;

type RegistrationBankAccountsSectionProps = {
  accounts: BankAccount[];
  onChange: (accounts: BankAccount[]) => void;
};

const defaultDraft: DraftBankAccount = {
  bankName: '',
  bik: '',
  accountNumber: '',
  correspondentAccount: '',
  currency: 'RUB',
  purpose: '',
  openedAt: '',
  isPrimary: false,
};

const currencyOptions: DraftBankAccount['currency'][] = ['RUB', 'USD', 'EUR', 'CNY'];

export const RegistrationBankAccountsSection = ({ accounts, onChange }: RegistrationBankAccountsSectionProps) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<DraftBankAccount>(defaultDraft);
  const [error, setError] = useState('');

  const hasAccounts = accounts.length > 0;
  const hasPrimary = useMemo(() => accounts.some((account) => account.isPrimary), [accounts]);

  const handleAdd = () => {
    if (!form.bankName.trim() || !form.bik.trim() || !form.accountNumber.trim() || !form.correspondentAccount.trim() || !form.currency) {
      setError('Заполните обязательные поля банковского счёта.');
      return;
    }

    const accountId = `ba-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const shouldBePrimary = !hasAccounts || Boolean(form.isPrimary);

    const nextAccounts = accounts.map((account) => ({
      ...account,
      isPrimary: shouldBePrimary ? false : account.isPrimary,
    }));

    nextAccounts.push({
      id: accountId,
      bankName: form.bankName.trim(),
      bik: form.bik.trim(),
      accountNumber: form.accountNumber.trim(),
      correspondentAccount: form.correspondentAccount.trim(),
      currency: form.currency,
      purpose: form.purpose.trim(),
      status: 'Активен',
      openedAt: form.openedAt || new Date().toISOString().slice(0, 10),
      isPrimary: shouldBePrimary,
    });

    onChange(nextAccounts);
    setForm(defaultDraft);
    setError('');
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const filtered = accounts.filter((account) => account.id !== id);
    if (filtered.length > 0 && !filtered.some((account) => account.isPrimary)) {
      filtered[0] = { ...filtered[0], isPrimary: true };
    }
    onChange(filtered);
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">Банковские реквизиты</h3>
        <Button size="sm" variant="secondary" onClick={() => setShowForm((current) => !current)}>
          {showForm ? 'Скрыть форму счёта' : '+ Добавить счёт'}
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        {accounts.length === 0 ? <p className="text-sm text-slate-500">Счета пока не добавлены.</p> : null}
        {accounts.map((account) => (
          <div key={account.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">{account.bankName}</span> · {account.accountNumber} · {account.currency}
              {account.isPrimary ? <span className="ml-2 rounded bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">Основной</span> : null}
            </div>
            <button
              type="button"
              onClick={() => handleDelete(account.id)}
              className="text-xs font-medium text-rose-600 transition hover:text-rose-700"
            >
              Удалить
            </button>
          </div>
        ))}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}

          <div className="grid gap-3 md:grid-cols-2">
            <RegistrationTextField label="Наименование банка *" value={form.bankName} onChange={(event) => setForm((prev) => ({ ...prev, bankName: event.target.value }))} />
            <RegistrationTextField label="БИК *" value={form.bik} onChange={(event) => setForm((prev) => ({ ...prev, bik: event.target.value }))} />
            <RegistrationTextField
              label="Расчётный счёт *"
              value={form.accountNumber}
              onChange={(event) => setForm((prev) => ({ ...prev, accountNumber: event.target.value }))}
            />
            <RegistrationTextField
              label="Корреспондентский счёт *"
              value={form.correspondentAccount}
              onChange={(event) => setForm((prev) => ({ ...prev, correspondentAccount: event.target.value }))}
            />
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Валюта *</span>
              <select
                value={form.currency}
                onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value as DraftBankAccount['currency'] }))}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                {currencyOptions.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>
            <RegistrationTextField label="Дата открытия" type="date" value={form.openedAt} onChange={(event) => setForm((prev) => ({ ...prev, openedAt: event.target.value }))} />
            <div className="md:col-span-2">
              <RegistrationTextField label="Назначение счёта" value={form.purpose} onChange={(event) => setForm((prev) => ({ ...prev, purpose: event.target.value }))} />
            </div>
          </div>

          <div className="mt-3">
            <RegistrationCheckboxGroup
              label="Основной счёт"
              value={hasAccounts ? (form.isPrimary ? 'yes' : 'no') : 'yes'}
              options={[
                { label: 'Да', value: 'yes' },
                { label: 'Нет', value: 'no' },
              ]}
              onChange={(value) => setForm((prev) => ({ ...prev, isPrimary: value === 'yes' }))}
            />
            {!hasPrimary && hasAccounts ? <p className="mt-1 text-xs text-slate-500">Рекомендуется выбрать основной счёт.</p> : null}
          </div>

          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={handleAdd}>
              Добавить счёт
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
};
