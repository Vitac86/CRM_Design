import { useEffect, useMemo, useState } from 'react';
import type { Client } from '../../data/types';
import { Button, Card } from '../ui';

type SubjectContractsTabProps = {
  client: Client;
};

type PersonType = 'physical' | 'legal' | 'ip';

type ContractWizardState = {
  joinedUnder428: {
    brokerAgreement: boolean;
    depositoryAgreement: boolean;
  };
  personType: PersonType;
  depoAccount: {
    owner: boolean;
    nomineeHolder: boolean;
    trustee: boolean;
  };
  depoOperatorEnabled: boolean;
  tradingDepoAccount: {
    owner: boolean;
    nomineeHolder: boolean;
    trustee: boolean;
  };
  tradingDepoOperatorEnabled: boolean;
  clearingOrganizations: {
    nkc: boolean;
    nrd: boolean;
  };
  reporting: {
    officePickup: boolean;
    registeredMail: boolean;
    emailEnabled: boolean;
    email: string;
    edoEnabled: boolean;
  };
  brokerageMarkets: {
    tariff: string;
    stockMarket: boolean;
    derivativesMarket: boolean;
    fxAndMetalsMarket: boolean;
  };
  additionalJoinTerms: {
    electronicSignature: boolean;
    quikProgram: boolean;
  };
  incomeTransfer: {
    toSpecialBrokerAccount: boolean;
    toBankDetails: boolean;
  };
};

const getPersonTypeFromClient = (clientType: string): PersonType => {
  const normalizedType = clientType.trim().toLowerCase();

  if (['фл', 'physical', 'individual'].includes(normalizedType)) {
    return 'physical';
  }

  if (['ип', 'ip', 'sole'].includes(normalizedType)) {
    return 'ip';
  }

  return 'legal';
};

const createDefaultState = (client: Client): ContractWizardState => ({
  joinedUnder428: {
    brokerAgreement: true,
    depositoryAgreement: true,
  },
  personType: getPersonTypeFromClient(client.type),
  depoAccount: {
    owner: true,
    nomineeHolder: false,
    trustee: false,
  },
  depoOperatorEnabled: true,
  tradingDepoAccount: {
    owner: true,
    nomineeHolder: false,
    trustee: false,
  },
  tradingDepoOperatorEnabled: true,
  clearingOrganizations: {
    nkc: true,
    nrd: false,
  },
  reporting: {
    officePickup: false,
    registeredMail: false,
    emailEnabled: Boolean(client.email),
    email: client.email ?? '',
    edoEnabled: true,
  },
  brokerageMarkets: {
    tariff: 'Универсальный',
    stockMarket: true,
    derivativesMarket: false,
    fxAndMetalsMarket: true,
  },
  additionalJoinTerms: {
    electronicSignature: false,
    quikProgram: false,
  },
  incomeTransfer: {
    toSpecialBrokerAccount: true,
    toBankDetails: false,
  },
});

const sectionCardClassName = 'space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
const sectionTitleClassName = 'text-base font-semibold text-slate-900';
const optionListClassName = 'space-y-2';
const optionLabelClassName =
  'flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/40 px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300';

const personTypeLabelMap: Record<PersonType, string> = {
  physical: 'Физическое лицо',
  legal: 'Юридическое лицо',
  ip: 'Индивидуальный предприниматель',
};

const clientTypeLabelMap: Record<PersonType, string> = {
  physical: 'ФЛ',
  legal: 'ЮЛ',
  ip: 'ИП',
};

export const SubjectContractsTab = ({ client }: SubjectContractsTabProps) => {
  const defaultState = useMemo(() => createDefaultState(client), [client]);
  const [formState, setFormState] = useState<ContractWizardState>(defaultState);

  useEffect(() => {
    setFormState(defaultState);
  }, [defaultState]);

  return (
    <div className="space-y-4">
      <Card className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Оформление договора</h2>
        <p className="text-sm text-slate-600">Настройка параметров заявления о присоединении и договоров клиента</p>
        <div className="grid gap-3 pt-1 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Клиент</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{client.name}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Код клиента</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{client.code}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Тип клиента</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{clientTypeLabelMap[formState.personType]}</p>
          </div>
        </div>
      </Card>

      <section className={sectionCardClassName}>
        <h3 className={sectionTitleClassName}>Заявление о присоединении</h3>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Документ будет сформирован на основе выбранных параметров и сохранен в карточке клиента.
        </div>
      </section>

      <section className={sectionCardClassName}>
        <h3 className={sectionTitleClassName}>Присоединяется согласно ст. 428 ГК РФ</h3>
        <div className={optionListClassName}>
          <label className={optionLabelClassName}>
            <input
              type="checkbox"
              checked={formState.joinedUnder428.brokerAgreement}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  joinedUnder428: { ...prev.joinedUnder428, brokerAgreement: event.target.checked },
                }))
              }
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30"
            />
            <span>Договор о брокерском обслуживании</span>
          </label>
          <label className={optionLabelClassName}>
            <input
              type="checkbox"
              checked={formState.joinedUnder428.depositoryAgreement}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  joinedUnder428: { ...prev.joinedUnder428, depositoryAgreement: event.target.checked },
                }))
              }
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30"
            />
            <span>Депозитарный договор</span>
          </label>
        </div>
      </section>

      <section className={sectionCardClassName}>
        <h3 className={sectionTitleClassName}>Тип лица</h3>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {(['physical', 'legal', 'ip'] as PersonType[]).map((option) => (
            <label key={option} className={optionLabelClassName}>
              <input
                type="radio"
                name="personType"
                value={option}
                checked={formState.personType === option}
                onChange={() => setFormState((prev) => ({ ...prev, personType: option }))}
                className="mt-0.5 h-4 w-4 border-slate-300 text-brand focus:ring-brand/30"
              />
              <span>{personTypeLabelMap[option]}</span>
            </label>
          ))}
        </div>
      </section>

      <section className={sectionCardClassName}>
        <h3 className={sectionTitleClassName}>Открыть счет депо</h3>
        <div className={optionListClassName}>
          <label className={optionLabelClassName}>
            <input type="checkbox" checked={formState.depoAccount.owner} onChange={(event) => setFormState((prev) => ({ ...prev, depoAccount: { ...prev.depoAccount, owner: event.target.checked } }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30" />
            <span>Владельца</span>
          </label>
          <label className={optionLabelClassName}>
            <input type="checkbox" checked={formState.depoAccount.nomineeHolder} onChange={(event) => setFormState((prev) => ({ ...prev, depoAccount: { ...prev.depoAccount, nomineeHolder: event.target.checked } }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30" />
            <span>Номинального держателя</span>
          </label>
          <label className={optionLabelClassName}>
            <input type="checkbox" checked={formState.depoAccount.trustee} onChange={(event) => setFormState((prev) => ({ ...prev, depoAccount: { ...prev.depoAccount, trustee: event.target.checked } }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30" />
            <span>Доверительного управляющего</span>
          </label>
        </div>
      </section>

      <section className={sectionCardClassName}>
        <h3 className={sectionTitleClassName}>ООО «Инвестика» оператором счета депо</h3>
        <label className={optionLabelClassName}>
          <input
            type="checkbox"
            checked={formState.depoOperatorEnabled}
            onChange={(event) => setFormState((prev) => ({ ...prev, depoOperatorEnabled: event.target.checked }))}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30"
          />
          <span>ООО «Инвестика» оператором счета депо</span>
        </label>
      </section>

      <section className={sectionCardClassName}>
        <h3 className={sectionTitleClassName}>Открыть торговый счет депо</h3>
        <div className={optionListClassName}>
          <label className={optionLabelClassName}>
            <input type="checkbox" checked={formState.tradingDepoAccount.owner} onChange={(event) => setFormState((prev) => ({ ...prev, tradingDepoAccount: { ...prev.tradingDepoAccount, owner: event.target.checked } }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30" />
            <span>Владельца</span>
          </label>
          <label className={optionLabelClassName}>
            <input type="checkbox" checked={formState.tradingDepoAccount.nomineeHolder} onChange={(event) => setFormState((prev) => ({ ...prev, tradingDepoAccount: { ...prev.tradingDepoAccount, nomineeHolder: event.target.checked } }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30" />
            <span>Номинального держателя</span>
          </label>
          <label className={optionLabelClassName}>
            <input type="checkbox" checked={formState.tradingDepoAccount.trustee} onChange={(event) => setFormState((prev) => ({ ...prev, tradingDepoAccount: { ...prev.tradingDepoAccount, trustee: event.target.checked } }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30" />
            <span>Доверительного управляющего</span>
          </label>
        </div>
      </section>

      <section className={sectionCardClassName}>
        <h3 className={sectionTitleClassName}>ООО «Инвестика» оператор торгового счета депо</h3>
        <label className={optionLabelClassName}>
          <input
            type="checkbox"
            checked={formState.tradingDepoOperatorEnabled}
            onChange={(event) => setFormState((prev) => ({ ...prev, tradingDepoOperatorEnabled: event.target.checked }))}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30"
          />
          <span>ООО «Инвестика» оператор торгового счета депо</span>
        </label>
      </section>

      <section className={sectionCardClassName}>
        <h3 className={sectionTitleClassName}>Клиринговая организация</h3>
        <div className={optionListClassName}>
          <label className={optionLabelClassName}>
            <input type="checkbox" checked={formState.clearingOrganizations.nkc} onChange={(event) => setFormState((prev) => ({ ...prev, clearingOrganizations: { ...prev.clearingOrganizations, nkc: event.target.checked } }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30" />
            <span>НКО НКЦ (АО) (ОГРН 1067711004481)</span>
          </label>
          <label className={optionLabelClassName}>
            <input type="checkbox" checked={formState.clearingOrganizations.nrd} onChange={(event) => setFormState((prev) => ({ ...prev, clearingOrganizations: { ...prev.clearingOrganizations, nrd: event.target.checked } }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30" />
            <span>НКО АО НРД (ОГРН 1027739123563)</span>
          </label>
        </div>
      </section>

      <section className={sectionCardClassName}>
        <h3 className={sectionTitleClassName}>ООО «Инвестика» обеспечить получение отчетов</h3>
        <div className={optionListClassName}>
          <label className={optionLabelClassName}>
            <input type="checkbox" checked={formState.reporting.officePickup} onChange={(event) => setFormState((prev) => ({ ...prev, reporting: { ...prev.reporting, officePickup: event.target.checked } }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30" />
            <span>В офисе ООО «Инвестика»</span>
          </label>
          <label className={optionLabelClassName}>
            <input type="checkbox" checked={formState.reporting.registeredMail} onChange={(event) => setFormState((prev) => ({ ...prev, reporting: { ...prev.reporting, registeredMail: event.target.checked } }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30" />
            <span>По почте заказным письмом</span>
          </label>
          <label className={optionLabelClassName}>
            <input type="checkbox" checked={formState.reporting.emailEnabled} onChange={(event) => setFormState((prev) => ({ ...prev, reporting: { ...prev.reporting, emailEnabled: event.target.checked } }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30" />
            <span>По электронной почте</span>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email для отчетов</span>
            <input
              type="email"
              value={formState.reporting.email}
              onChange={(event) => setFormState((prev) => ({ ...prev, reporting: { ...prev.reporting, email: event.target.value } }))}
              disabled={!formState.reporting.emailEnabled}
              placeholder="name@example.com"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </label>
          <label className={optionLabelClassName}>
            <input type="checkbox" checked={formState.reporting.edoEnabled} onChange={(event) => setFormState((prev) => ({ ...prev, reporting: { ...prev.reporting, edoEnabled: event.target.checked } }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30" />
            <span>По системе ЭДО</span>
          </label>
        </div>
      </section>

      <section className={sectionCardClassName}>
        <h3 className={sectionTitleClassName}>ООО «Инвестика» брокерское обслуживание на следующих рынках</h3>
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Тариф для всех счетов</span>
          <select
            value={formState.brokerageMarkets.tariff}
            onChange={(event) => setFormState((prev) => ({ ...prev, brokerageMarkets: { ...prev.brokerageMarkets, tariff: event.target.value } }))}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
          >
            <option value="Универсальный">Универсальный</option>
            <option value="Консервативный">Консервативный</option>
            <option value="Премиальный">Премиальный</option>
          </select>
        </label>
        <div className={optionListClassName}>
          <label className={optionLabelClassName}>
            <input type="checkbox" checked={formState.brokerageMarkets.stockMarket} onChange={(event) => setFormState((prev) => ({ ...prev, brokerageMarkets: { ...prev.brokerageMarkets, stockMarket: event.target.checked } }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30" />
            <span>Фондовый рынок</span>
          </label>
          <label className={optionLabelClassName}>
            <input type="checkbox" checked={formState.brokerageMarkets.derivativesMarket} onChange={(event) => setFormState((prev) => ({ ...prev, brokerageMarkets: { ...prev.brokerageMarkets, derivativesMarket: event.target.checked } }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30" />
            <span>Срочный рынок</span>
          </label>
          <label className={optionLabelClassName}>
            <input type="checkbox" checked={formState.brokerageMarkets.fxAndMetalsMarket} onChange={(event) => setFormState((prev) => ({ ...prev, brokerageMarkets: { ...prev.brokerageMarkets, fxAndMetalsMarket: event.target.checked } }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30" />
            <span>Валютный рынок и рынок драгоценных металлов</span>
          </label>
        </div>
      </section>

      <section className={sectionCardClassName}>
        <h3 className={sectionTitleClassName}>Присоединяется согласно ст. 428 ГК</h3>
        <div className={optionListClassName}>
          <label className={optionLabelClassName}>
            <input type="checkbox" checked={formState.additionalJoinTerms.electronicSignature} onChange={(event) => setFormState((prev) => ({ ...prev, additionalJoinTerms: { ...prev.additionalJoinTerms, electronicSignature: event.target.checked } }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30" />
            <span>Использование электронной подписи и обмен электронными документами</span>
          </label>
          <label className={optionLabelClassName}>
            <input type="checkbox" checked={formState.additionalJoinTerms.quikProgram} onChange={(event) => setFormState((prev) => ({ ...prev, additionalJoinTerms: { ...prev.additionalJoinTerms, quikProgram: event.target.checked } }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30" />
            <span>Использовать программы для ЭВМ РМ клиента QUIK MP «Брокер»</span>
          </label>
        </div>
      </section>

      <section className={sectionCardClassName}>
        <h3 className={sectionTitleClassName}>Просит доходы перечислять</h3>
        <div className={optionListClassName}>
          <label className={optionLabelClassName}>
            <input type="checkbox" checked={formState.incomeTransfer.toSpecialBrokerAccount} onChange={(event) => setFormState((prev) => ({ ...prev, incomeTransfer: { ...prev.incomeTransfer, toSpecialBrokerAccount: event.target.checked } }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30" />
            <span>На специальный брокерский счет</span>
          </label>
          <label className={optionLabelClassName}>
            <input type="checkbox" checked={formState.incomeTransfer.toBankDetails} onChange={(event) => setFormState((prev) => ({ ...prev, incomeTransfer: { ...prev.incomeTransfer, toBankDetails: event.target.checked } }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30" />
            <span>На банковские реквизиты</span>
          </label>
        </div>
      </section>

      <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="secondary">Сохранить настройки</Button>
          <Button variant="secondary">Выгрузить заявление</Button>
          <Button>Заключить договор</Button>
        </div>
      </Card>
    </div>
  );
};
