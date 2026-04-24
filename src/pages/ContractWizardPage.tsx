import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useClientsStore } from '../app/ClientsStore';
import {
  createClientContract,
  createDefaultContractConfig,
  getClientContractById,
  getContractConfigById,
  updateClientContract,
  updateContractConfig,
} from '../data/clientContracts';
import type { Client, ContractProductType, ContractWizardConfig } from '../data/types';
import { Button, Card, EmptyState } from '../components/ui';

const createInitialState = (client: Client): ContractWizardConfig =>
  createDefaultContractConfig({
    clientEmail: client.email,
    clientType: client.type,
  });

const resolveContractType = (form: ContractWizardConfig): ContractProductType => {
  if (form.joinedUnder428.depositoryContract) {
    return 'depository';
  }

  if (form.joinedUnder428.brokerageContract) {
    return 'broker';
  }

  return 'other';
};

const mapContractConfigToClientPatch = (form: ContractWizardConfig) => ({
  canUseMoney: form.incomeTransfer.specialBrokerAccount,
  canUseSecurities: form.tradingDepoOperatorEnabled,
  reportDelivery: {
    email: {
      enabled: form.reporting.emailEnabled,
      address: form.reporting.email,
    },
    personalAccount: {
      enabled: form.reporting.edo,
    },
  },
});

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <Card className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-base font-semibold text-slate-900">{title}</h2>
    {children}
  </Card>
);

const Check = ({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) => (
  <label className="flex items-center gap-3 text-sm text-slate-700">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/40" />
    <span>{label}</span>
  </label>
);

export const ContractWizardPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { subjectId } = useParams();
  const { getClientById, updateClient } = useClientsStore();

  const client = useMemo(() => {
    if (!subjectId) {
      return undefined;
    }

    return getClientById(subjectId);
  }, [getClientById, subjectId]);

  const contractId = searchParams.get('contractId')?.trim() || null;
  const editingContract = useMemo(() => {
    if (!contractId) {
      return undefined;
    }

    return getClientContractById(contractId);
  }, [contractId]);
  const isEditMode = Boolean(editingContract);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [form, setForm] = useState<ContractWizardConfig | null>(null);

  useEffect(() => {
    if (!client) {
      setForm(null);
      return;
    }

    if (editingContract && editingContract.clientId === client.id) {
      const storedConfig = getContractConfigById(editingContract.id);
      setForm(storedConfig ?? createInitialState(client));
      return;
    }

    setForm(createInitialState(client));
  }, [client, editingContract]);

  if (!client || !form || (editingContract && editingContract.clientId !== client.id)) {
    return (
      <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
        <EmptyState title="Клиент или договор не найден" description="Не удалось открыть мастер оформления договора для выбранного субъекта." />
        <div>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Назад
          </Button>
        </div>
      </div>
    );
  }

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2000);
  };

  const persistDraft = () => {
    if (!isEditMode || !editingContract) {
      showToast('Черновик доступен после создания договора');
      return;
    }

    updateContractConfig(editingContract.id, form);
    updateClient(client.id, mapContractConfigToClientPatch(form));
    showToast('Настройки договора сохранены');
  };

  const exportStatement = () => {
    const content = `Заявление о присоединении\nКлиент: ${client.name}\nКод: ${client.code}\nТип лица: ${form.personType}\nТариф: ${form.brokerageMarkets.tariff}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `statement-${client.code}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Заявление выгружено');
  };

  const submitContract = () => {
    const contractType = resolveContractType(form);

    if (isEditMode && editingContract) {
      updateClientContract(editingContract.id, { type: contractType });
      updateContractConfig(editingContract.id, form);
      updateClient(client.id, mapContractConfigToClientPatch(form));

      navigate(`/subjects/${client.id}?tab=contracts`, { state: { toastMessage: `Договор ${editingContract.number} обновлён` } });
      return;
    }

    const createdContract = createClientContract({
      clientId: client.id,
      type: contractType,
      status: 'active',
      closeDate: null,
      config: form,
    });

    updateClient(client.id, mapContractConfigToClientPatch(form));
    navigate(`/subjects/${client.id}?tab=contracts`, { state: { toastMessage: `Договор ${createdContract.number} оформлен` } });
  };

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <Card className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{isEditMode && editingContract ? `Редактирование договора ${editingContract.number}` : 'Новый договор'}</h1>
            <p className="mt-1 text-sm text-slate-600">Настройка параметров заявления о присоединении и договоров клиента</p>
          </div>
          <Button variant="secondary" onClick={() => navigate(`/subjects/${client.id}?tab=contracts`)}>
            Назад к договорам
          </Button>
        </div>

        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Клиент</p>
            <p className="font-medium text-slate-900">{client.name}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">ИНН</p>
            <p className="font-mono font-medium text-slate-900">{client.inn?.trim() || '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
            <p className="font-medium text-slate-900">{client.email?.trim() || '—'}</p>
          </div>
        </div>
      </Card>

      <Section title="Присоединяется согласно ст. 428 ГК РФ">
        <div className="space-y-3">
          <Check label="Договор о брокерском обслуживании" checked={form.joinedUnder428.brokerageContract} onChange={(value) => setForm((prev) => prev ? ({ ...prev, joinedUnder428: { ...prev.joinedUnder428, brokerageContract: value } }) : prev)} />
          <Check label="Депозитарный договор" checked={form.joinedUnder428.depositoryContract} onChange={(value) => setForm((prev) => prev ? ({ ...prev, joinedUnder428: { ...prev.joinedUnder428, depositoryContract: value } }) : prev)} />
        </div>
      </Section>

      <Section title="Тип лица">
        <div className="space-y-3">
          {[
            { value: 'individual' as const, label: 'Физическое лицо' },
            { value: 'legal' as const, label: 'Юридическое лицо' },
            { value: 'entrepreneur' as const, label: 'Индивидуальный предприниматель' },
          ].map((option) => (
            <label key={option.value} className="flex items-center gap-3 text-sm text-slate-700">
              <input type="radio" name="personType" checked={form.personType === option.value} onChange={() => setForm((prev) => prev ? ({ ...prev, personType: option.value }) : prev)} className="h-4 w-4 border-slate-300 text-brand focus:ring-brand/40" />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Открыть счет депо">
        <div className="space-y-3">
          <Check label="Владельца" checked={form.depoAccount.owner} onChange={(value) => setForm((prev) => prev ? ({ ...prev, depoAccount: { ...prev.depoAccount, owner: value } }) : prev)} />
          <Check label="Номинального держателя" checked={form.depoAccount.nomineeHolder} onChange={(value) => setForm((prev) => prev ? ({ ...prev, depoAccount: { ...prev.depoAccount, nomineeHolder: value } }) : prev)} />
          <Check label="Доверительного управляющего" checked={form.depoAccount.trustManager} onChange={(value) => setForm((prev) => prev ? ({ ...prev, depoAccount: { ...prev.depoAccount, trustManager: value } }) : prev)} />
        </div>
      </Section>

      <Section title="ООО «Инвестика» оператором счета депо">
        <Check label="ООО «Инвестика» оператором счета депо" checked={form.depoOperatorEnabled} onChange={(value) => setForm((prev) => prev ? ({ ...prev, depoOperatorEnabled: value }) : prev)} />
      </Section>

      <Section title="Открыть торговый счет депо">
        <div className="space-y-3">
          <Check label="Владельца" checked={form.tradingDepoAccount.owner} onChange={(value) => setForm((prev) => prev ? ({ ...prev, tradingDepoAccount: { ...prev.tradingDepoAccount, owner: value } }) : prev)} />
          <Check label="Номинального держателя" checked={form.tradingDepoAccount.nomineeHolder} onChange={(value) => setForm((prev) => prev ? ({ ...prev, tradingDepoAccount: { ...prev.tradingDepoAccount, nomineeHolder: value } }) : prev)} />
          <Check label="Доверительного управляющего" checked={form.tradingDepoAccount.trustManager} onChange={(value) => setForm((prev) => prev ? ({ ...prev, tradingDepoAccount: { ...prev.tradingDepoAccount, trustManager: value } }) : prev)} />
        </div>
      </Section>

      <Section title="ООО «Инвестика» оператор торгового счета депо">
        <Check label="ООО «Инвестика» оператор торгового счета депо" checked={form.tradingDepoOperatorEnabled} onChange={(value) => setForm((prev) => prev ? ({ ...prev, tradingDepoOperatorEnabled: value }) : prev)} />
      </Section>

      <Section title="Клиринговая организация">
        <div className="space-y-3">
          <Check label="НКО НКЦ (АО) (ОГРН 1067711004481)" checked={form.clearingOrganizations.nkc} onChange={(value) => setForm((prev) => prev ? ({ ...prev, clearingOrganizations: { ...prev.clearingOrganizations, nkc: value } }) : prev)} />
          <Check label="НКО АО НРД (ОГРН 1027739123563)" checked={form.clearingOrganizations.nrd} onChange={(value) => setForm((prev) => prev ? ({ ...prev, clearingOrganizations: { ...prev.clearingOrganizations, nrd: value } }) : prev)} />
        </div>
      </Section>

      <Section title="ООО «Инвестика» обеспечить получение отчетов">
        <div className="space-y-3">
          <Check label="В офисе ООО «Инвестика»" checked={form.reporting.office} onChange={(value) => setForm((prev) => prev ? ({ ...prev, reporting: { ...prev.reporting, office: value } }) : prev)} />
          <Check label="По почте заказным письмом" checked={form.reporting.post} onChange={(value) => setForm((prev) => prev ? ({ ...prev, reporting: { ...prev.reporting, post: value } }) : prev)} />
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <Check label="По электронной почте" checked={form.reporting.emailEnabled} onChange={(value) => setForm((prev) => prev ? ({ ...prev, reporting: { ...prev.reporting, emailEnabled: value } }) : prev)} />
            <input value={form.reporting.email} onChange={(event) => setForm((prev) => prev ? ({ ...prev, reporting: { ...prev.reporting, email: event.target.value } }) : prev)} placeholder="Введите email" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none" />
          </div>
          <Check label="По системе ЭДО" checked={form.reporting.edo} onChange={(value) => setForm((prev) => prev ? ({ ...prev, reporting: { ...prev.reporting, edo: value } }) : prev)} />
        </div>
      </Section>

      <Section title="ООО «Инвестика» брокерское обслуживание на следующих рынках">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 sm:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Тариф для всех счетов</span>
            <select value={form.brokerageMarkets.tariff} onChange={(event) => setForm((prev) => prev ? ({ ...prev, brokerageMarkets: { ...prev.brokerageMarkets, tariff: event.target.value } }) : prev)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none">
              <option value="Универсальный">Универсальный</option>
              <option value="Инвестор">Инвестор</option>
              <option value="Премиум">Премиум</option>
            </select>
          </label>
          <Check label="Фондовый рынок" checked={form.brokerageMarkets.stockMarket} onChange={(value) => setForm((prev) => prev ? ({ ...prev, brokerageMarkets: { ...prev.brokerageMarkets, stockMarket: value } }) : prev)} />
          <Check label="Срочный рынок" checked={form.brokerageMarkets.futuresMarket} onChange={(value) => setForm((prev) => prev ? ({ ...prev, brokerageMarkets: { ...prev.brokerageMarkets, futuresMarket: value } }) : prev)} />
          <Check label="Валютный рынок и рынок драгоценных металлов" checked={form.brokerageMarkets.currencyAndMetalsMarket} onChange={(value) => setForm((prev) => prev ? ({ ...prev, brokerageMarkets: { ...prev.brokerageMarkets, currencyAndMetalsMarket: value } }) : prev)} />
        </div>
      </Section>

      <Section title="Присоединяется согласно ст. 428 ГК">
        <div className="space-y-3">
          <Check label="Использование электронной подписи и обмен электронными документами" checked={form.additionalJoinTerms.electronicSignature} onChange={(value) => setForm((prev) => prev ? ({ ...prev, additionalJoinTerms: { ...prev.additionalJoinTerms, electronicSignature: value } }) : prev)} />
          <Check label="Использовать программы для ЭВМ РМ клиента QUIK MP «Брокер»" checked={form.additionalJoinTerms.quikProgram} onChange={(value) => setForm((prev) => prev ? ({ ...prev, additionalJoinTerms: { ...prev.additionalJoinTerms, quikProgram: value } }) : prev)} />
        </div>
      </Section>

      <Section title="Просит доходы перечислять">
        <div className="space-y-3">
          <Check label="На специальный брокерский счет" checked={form.incomeTransfer.specialBrokerAccount} onChange={(value) => setForm((prev) => prev ? ({ ...prev, incomeTransfer: { ...prev.incomeTransfer, specialBrokerAccount: value } }) : prev)} />
          <Check label="На банковские реквизиты" checked={form.incomeTransfer.bankDetails} onChange={(value) => setForm((prev) => prev ? ({ ...prev, incomeTransfer: { ...prev.incomeTransfer, bankDetails: value } }) : prev)} />
        </div>
      </Section>

      <Card className="sticky bottom-3 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <Button variant="secondary" onClick={persistDraft}>
          Сохранить настройки заявления
        </Button>
        <Button onClick={submitContract}>{isEditMode ? 'Сохранить изменения' : 'Заключить договор'}</Button>
        <Button variant="secondary" onClick={exportStatement}>
          Выгрузить заявление
        </Button>
        <Button variant="secondary" onClick={() => navigate(`/subjects/${client.id}?tab=contracts`)}>
          Назад к договорам
        </Button>
      </Card>

      {toastMessage ? <div className="fixed right-6 bottom-6 z-50 rounded-md bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">{toastMessage}</div> : null}
    </div>
  );
};
