import { useMemo, useState } from 'react';
import type { BankAccount, Client } from '../../data/types';
import { Badge, Button } from '../ui';

type SubjectBankAccountsTabProps = {
  client: Client;
  onAddAccount?: (account: BankAccount) => void;
  onUpdateAccounts?: (accounts: BankAccount[]) => void;
};

type AccountForm = Omit<BankAccount, 'id'>;

const defaultFormState: AccountForm = {
  bankName: '',
  bik: '',
  accountNumber: '',
  correspondentAccount: '',
  currency: 'RUB',
  purpose: '',
  openedAt: '',
  isPrimary: false,
};

const buildFormFromAccount = (account: BankAccount): AccountForm => ({
  bankName: account.bankName,
  bik: account.bik,
  accountNumber: account.accountNumber,
  correspondentAccount: account.correspondentAccount,
  currency: account.currency,
  purpose: account.purpose,
  openedAt: account.openedAt,
  isPrimary: account.isPrimary ?? false,
});

const isFormValid = (formData: AccountForm) =>
  Boolean(formData.bankName.trim() && formData.bik.trim() && formData.accountNumber.trim() && formData.correspondentAccount.trim());

export const SubjectBankAccountsTab = ({ client, onAddAccount, onUpdateAccounts }: SubjectBankAccountsTabProps) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [formData, setFormData] = useState<AccountForm>(defaultFormState);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingFormData, setEditingFormData] = useState<AccountForm>(defaultFormState);
  const [editingValidationError, setEditingValidationError] = useState<string | null>(null);
  const accounts = useMemo(() => client.bankAccounts ?? [], [client.bankAccounts]);

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setValidationError(null);
    setFormData(defaultFormState);
  };

  const handleSubmitAdd = () => {
    if (!isFormValid(formData)) {
      setValidationError('Заполните обязательные поля');
      return;
    }

    onAddAccount?.({
      ...formData,
      id: `ba-${Date.now()}`,
      openedAt: formData.openedAt || new Date().toISOString().slice(0, 10),
      purpose: formData.purpose.trim() || 'Без назначения',
      isPrimary: formData.isPrimary ?? false,
    });

    handleCancelAdd();
  };

  const handleStartEdit = (account: BankAccount) => {
    setEditingAccountId(account.id);
    setEditingValidationError(null);
    setEditingFormData(buildFormFromAccount(account));
  };

  const handleCancelEdit = () => {
    setEditingAccountId(null);
    setEditingValidationError(null);
    setEditingFormData(defaultFormState);
  };

  const handleSaveEdit = (accountId: string) => {
    if (!isFormValid(editingFormData)) {
      setEditingValidationError('Заполните обязательные поля');
      return;
    }

    onUpdateAccounts?.(
      accounts.map((account) =>
        account.id === accountId
          ? {
              ...account,
              ...editingFormData,
              openedAt: editingFormData.openedAt || account.openedAt || new Date().toISOString().slice(0, 10),
              purpose: editingFormData.purpose.trim() || 'Без назначения',
            }
          : account,
      ),
    );

    handleCancelEdit();
  };

  const handleSetPrimary = (accountId: string) => {
    onUpdateAccounts?.(
      accounts.map((account) => ({
        ...account,
        isPrimary: account.id === accountId,
      })),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Банковские реквизиты</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">Расчётные и специальные счета клиента</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowAddForm(true)}>
          + Добавить счёт
        </Button>
      </div>

      {showAddForm ? (
        <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Новый счёт</h3>

          {validationError ? <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{validationError}</div> : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Наименование банка *</span>
              <input
                value={formData.bankName}
                onChange={(event) => setFormData((prev) => ({ ...prev, bankName: event.target.value }))}
                className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm text-[var(--color-text-primary)] focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">БИК *</span>
              <input
                value={formData.bik}
                onChange={(event) => setFormData((prev) => ({ ...prev, bik: event.target.value }))}
                className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 font-mono text-sm text-[var(--color-text-primary)] focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Валюта *</span>
              <select
                value={formData.currency}
                onChange={(event) => setFormData((prev) => ({ ...prev, currency: event.target.value as AccountForm['currency'] }))}
                className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm text-[var(--color-text-primary)] focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
              >
                <option value="RUB">RUB</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="CNY">CNY</option>
              </select>
            </label>
            <label className="space-y-1 md:col-span-2 xl:col-span-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Расчётный счёт *</span>
              <input
                value={formData.accountNumber}
                onChange={(event) => setFormData((prev) => ({ ...prev, accountNumber: event.target.value }))}
                className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 font-mono text-sm text-[var(--color-text-primary)] focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
              />
            </label>
            <label className="space-y-1 md:col-span-2 xl:col-span-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Корреспондентский счёт *</span>
              <input
                value={formData.correspondentAccount}
                onChange={(event) => setFormData((prev) => ({ ...prev, correspondentAccount: event.target.value }))}
                className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 font-mono text-sm text-[var(--color-text-primary)] focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Дата открытия</span>
              <input
                type="date"
                value={formData.openedAt}
                onChange={(event) => setFormData((prev) => ({ ...prev, openedAt: event.target.value }))}
                className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm text-[var(--color-text-primary)] focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
              />
            </label>
            <label className="space-y-1 md:col-span-2 xl:col-span-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Назначение</span>
              <input
                value={formData.purpose}
                onChange={(event) => setFormData((prev) => ({ ...prev, purpose: event.target.value }))}
                className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm text-[var(--color-text-primary)] focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={handleCancelAdd}>
              Отмена
            </Button>
            <Button size="sm" onClick={handleSubmitAdd}>
              Добавить
            </Button>
          </div>
        </div>
      ) : null}

      {accounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center shadow-sm">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Банковские счета не добавлены</h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Добавьте первый счёт клиента для отображения реквизитов.</p>
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={() => setShowAddForm(true)}>
              + Добавить счёт
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {accounts.map((account) => {
            const isEditing = editingAccountId === account.id;

            return (
              <article key={account.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{account.bankName}</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">{account.purpose}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {account.isPrimary ? <Badge variant="brand">Основной</Badge> : null}
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-4 space-y-4 border-t border-[var(--color-border)] pt-4">
                    {editingValidationError ? (
                      <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{editingValidationError}</div>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <label className="space-y-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Наименование банка *</span>
                        <input
                          value={editingFormData.bankName}
                          onChange={(event) => setEditingFormData((prev) => ({ ...prev, bankName: event.target.value }))}
                          className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm text-[var(--color-text-primary)] focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">БИК *</span>
                        <input
                          value={editingFormData.bik}
                          onChange={(event) => setEditingFormData((prev) => ({ ...prev, bik: event.target.value }))}
                          className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 font-mono text-sm text-[var(--color-text-primary)] focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Валюта *</span>
                        <select
                          value={editingFormData.currency}
                          onChange={(event) => setEditingFormData((prev) => ({ ...prev, currency: event.target.value as AccountForm['currency'] }))}
                          className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm text-[var(--color-text-primary)] focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                        >
                          <option value="RUB">RUB</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="CNY">CNY</option>
                        </select>
                      </label>
                      <label className="space-y-1 md:col-span-2 xl:col-span-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Расчётный счёт *</span>
                        <input
                          value={editingFormData.accountNumber}
                          onChange={(event) => setEditingFormData((prev) => ({ ...prev, accountNumber: event.target.value }))}
                          className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 font-mono text-sm text-[var(--color-text-primary)] focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                        />
                      </label>
                      <label className="space-y-1 md:col-span-2 xl:col-span-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Корреспондентский счёт *</span>
                        <input
                          value={editingFormData.correspondentAccount}
                          onChange={(event) => setEditingFormData((prev) => ({ ...prev, correspondentAccount: event.target.value }))}
                          className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 font-mono text-sm text-[var(--color-text-primary)] focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Дата открытия</span>
                        <input
                          type="date"
                          value={editingFormData.openedAt}
                          onChange={(event) => setEditingFormData((prev) => ({ ...prev, openedAt: event.target.value }))}
                          className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm text-[var(--color-text-primary)] focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                        />
                      </label>
                      <label className="space-y-1 md:col-span-2 xl:col-span-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Назначение</span>
                        <input
                          value={editingFormData.purpose}
                          onChange={(event) => setEditingFormData((prev) => ({ ...prev, purpose: event.target.value }))}
                          className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm text-[var(--color-text-primary)] focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                        />
                      </label>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={handleCancelEdit}>
                        Отмена
                      </Button>
                      <Button size="sm" onClick={() => handleSaveEdit(account.id)}>
                        Сохранить
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                      <div>
                        <dt className="text-[var(--color-text-muted)]">БИК</dt>
                        <dd className="font-mono text-[var(--color-text-primary)]">{account.bik}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-text-muted)]">Валюта</dt>
                        <dd className="text-[var(--color-text-primary)]">{account.currency}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-text-muted)]">Расчётный счёт</dt>
                        <dd className="font-mono text-[var(--color-text-primary)]">{account.accountNumber}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-text-muted)]">Дата открытия</dt>
                        <dd className="text-[var(--color-text-primary)]">{account.openedAt}</dd>
                      </div>
                      <div className="md:col-span-2">
                        <dt className="text-[var(--color-text-muted)]">Корреспондентский счёт</dt>
                        <dd className="font-mono text-[var(--color-text-primary)]">{account.correspondentAccount}</dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3">
                      <Button variant="secondary" size="sm" onClick={() => handleStartEdit(account)}>
                        Редактировать
                      </Button>
                      {!account.isPrimary ? (
                        <Button variant="secondary" size="sm" onClick={() => handleSetPrimary(account.id)}>
                          Сделать основным
                        </Button>
                      ) : null}
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
