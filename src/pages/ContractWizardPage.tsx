import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDataAccess } from '../app/dataAccess/useDataAccess';
import { routes } from '../routes/paths';
import type { Client, ClientContract, ContractProductType, ContractWizardConfig } from '../data/types';
import { Button, Card, EmptyState } from '../components/ui';

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
  <Card className="space-y-4 rounded-2xl p-5 shadow-sm">
    <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h2>
    {children}
  </Card>
);

const Check = ({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) => (
  <label className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-[var(--color-input-border)] text-brand focus:ring-brand/40" />
    <span>{label}</span>
  </label>
);

export const ContractWizardPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { subjectId } = useParams();
  const { clients: clientsRepository, contracts: contractsRepository } = useDataAccess();
  const [client, setClient] = useState<Client | null>(null);
  const [editingContract, setEditingContract] = useState<ClientContract | null>(null);

  const contractId = searchParams.get('contractId')?.trim() || null;
  const isEditMode = Boolean(editingContract);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [form, setForm] = useState<ContractWizardConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadWizardState = async () => {
      if (!subjectId) {
        if (isMounted) {
          setClient(null);
          setEditingContract(null);
          setForm(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      const loadedClient = await clientsRepository.getClientById(subjectId);
      if (!isMounted || !loadedClient) {
        if (isMounted) {
          setClient(null);
          setEditingContract(null);
          setForm(null);
          setIsLoading(false);
        }
        return;
      }

      let loadedContract = null;
      if (contractId) {
        loadedContract = await contractsRepository.getContractById(contractId);
      }

      let nextForm: ContractWizardConfig;
      if (loadedContract && loadedContract.clientId === loadedClient.id) {
        const storedConfig = await contractsRepository.getContractConfigById(loadedContract.id);
        nextForm =
          storedConfig ??
          (await contractsRepository.createDefaultContractConfig({
            clientEmail: loadedClient.email,
            clientType: loadedClient.type,
          }));
      } else {
        nextForm = await contractsRepository.createDefaultContractConfig({
          clientEmail: loadedClient.email,
          clientType: loadedClient.type,
        });
      }

      if (isMounted) {
        setClient(loadedClient);
        setEditingContract(loadedContract);
        setForm(nextForm);
        setIsLoading(false);
      }
    };

    void loadWizardState();

    return () => {
      isMounted = false;
    };
  }, [clientsRepository, contractId, contractsRepository, subjectId]);

  if (isLoading) {
    return null;
  }

  if (!client || !form || (editingContract && editingContract.clientId !== client.id)) {
    return (
      <div className="min-w-0 space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5">
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

    void (async () => {
      await contractsRepository.updateContractConfig(editingContract.id, form);
      await clientsRepository.updateClient(client.id, mapContractConfigToClientPatch(form));
      showToast('Настройки договора сохранены');
    })();
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
    void (async () => {
      const contractType = resolveContractType(form);

      if (isEditMode && editingContract) {
        await contractsRepository.updateContract(editingContract.id, { type: contractType });
        await contractsRepository.updateContractConfig(editingContract.id, form);
        await clientsRepository.updateClient(client.id, mapContractConfigToClientPatch(form));

        navigate(`${routes.subject(client.id)}?tab=contracts`, { state: { toastMessage: `Договор ${editingContract.number} обновлён` } });
        return;
      }

      const createdContract = await contractsRepository.createContract({
        clientId: client.id,
        type: contractType,
        status: 'active',
        closeDate: null,
        config: form,
      });

      await clientsRepository.updateClient(client.id, mapContractConfigToClientPatch(form));
      navigate(`${routes.subject(client.id)}?tab=contracts`, { state: { toastMessage: `Договор ${createdContract.number} оформлен` } });
    })();
  };

  return (
    <div className="min-w-0 space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5">
      <Card className="space-y-4 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">{isEditMode && editingContract ? `Редактирование договора ${editingContract.number}` : 'Новый договор'}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Настройка параметров заявления о присоединении и договоров клиента</p>
          </div>
          <Button variant="secondary" onClick={() => navigate(`${routes.subject(client.id)}?tab=contracts`)}>
            Назад к договорам
          </Button>
        </div>

        <div className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted-surface)] p-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Клиент</p>
            <p className="font-medium text-[var(--color-text-primary)]">{client.name}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">ИНН</p>
            <p className="font-mono font-medium text-[var(--color-text-primary)]">{client.inn?.trim() || '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Email</p>
            <p className="font-medium text-[var(--color-text-primary)]">{client.email?.trim() || '—'}</p>
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
            <label key={option.value} className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
              <input type="radio" name="personType" checked={form.personType === option.value} onChange={() => setForm((prev) => prev ? ({ ...prev, personType: option.value }) : prev)} className="h-4 w-4 border-[var(--color-input-border)] text-brand focus:ring-brand/40" />
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
          <div className="space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted-surface)] p-3">
            <Check label="По электронной почте" checked={form.reporting.emailEnabled} onChange={(value) => setForm((prev) => prev ? ({ ...prev, reporting: { ...prev.reporting, emailEnabled: value } }) : prev)} />
            <input value={form.reporting.email} onChange={(event) => setForm((prev) => prev ? ({ ...prev, reporting: { ...prev.reporting, email: event.target.value } }) : prev)} placeholder="Введите email" className="h-10 w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 text-sm text-[var(--color-input-text)] placeholder:text-[var(--color-input-placeholder)] focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none" />
          </div>
          <Check label="По системе ЭДО" checked={form.reporting.edo} onChange={(value) => setForm((prev) => prev ? ({ ...prev, reporting: { ...prev.reporting, edo: value } }) : prev)} />
        </div>
      </Section>

      <Section title="ООО «Инвестика» брокерское обслуживание на следующих рынках">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 sm:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Тариф для всех счетов</span>
            <select value={form.brokerageMarkets.tariff} onChange={(event) => setForm((prev) => prev ? ({ ...prev, brokerageMarkets: { ...prev.brokerageMarkets, tariff: event.target.value } }) : prev)} className="h-10 w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input)] px-3 text-sm text-[var(--color-input-text)] focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none">
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

      <Card className="crm-action-bar sticky bottom-3 z-20 flex flex-wrap items-center gap-2 rounded-2xl border p-4 backdrop-blur">
        <Button variant="secondary" onClick={persistDraft}>
          Сохранить настройки заявления
        </Button>
        <Button onClick={submitContract}>{isEditMode ? 'Сохранить изменения' : 'Заключить договор'}</Button>
        <Button variant="secondary" onClick={exportStatement}>
          Выгрузить заявление
        </Button>
        <Button variant="secondary" onClick={() => navigate(`${routes.subject(client.id)}?tab=contracts`)}>
          Назад к договорам
        </Button>
      </Card>

      {toastMessage ? <div className="fixed right-6 bottom-6 z-50 rounded-md bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">{toastMessage}</div> : null}
    </div>
  );
};
