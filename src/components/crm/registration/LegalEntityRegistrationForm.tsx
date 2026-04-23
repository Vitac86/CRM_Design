import type { BankAccount, RepresentativeDocument } from '../../../data/types';
import { Card } from '../../ui';
import { RegistrationBankAccountsSection } from './RegistrationBankAccountsSection';
import { RegistrationCheckboxGroup } from './RegistrationCheckboxGroup';
import { RegistrationTextField } from './RegistrationTextField';

type LegalEntityFormData = {
  clientName: string;
  fullName: string;
  englishName: string;
  englishFullName: string;
  parentCompany: string;
  qualifiedInvestor: string;
  cashPermission: string;
  securitiesPermission: string;
  inn: string;
  kpp: string;
  ogrn: string;
  registrationDate: string;
  registrationAuthority: string;
  authorizedCapital: string;
  registrarName: string;
  taxName: string;
  taxCode: string;
  fssNumber: string;
  pfrNumber: string;
  residency: string;
  phones: string;
  email: string;
  address: string;
  beneficiary: string;
  authorizedPersons: string;
  okato: string;
  oktmo: string;
  okpo: string;
  okfs: string;
  okogu: string;
  bankAccounts: BankAccount[];
  representativeFullName: string;
  representativePosition: string;
  representativeBirthDate: string;
  representativeDocumentType: RepresentativeDocument['type'];
  representativeDocumentTitle: string;
  representativeDocumentSeries: string;
  representativeDocumentNumber: string;
  representativeDocumentIssuedBy: string;
  representativeDocumentIssuedAt: string;
  representativeDocumentDivisionCode: string;
};

type LegalEntityRegistrationFormProps = {
  formData: LegalEntityFormData;
  onChange: <K extends keyof LegalEntityFormData>(field: K, value: LegalEntityFormData[K]) => void;
};

const yesNoOptions = [
  { label: 'Да', value: 'yes' },
  { label: 'Нет', value: 'no' },
];

export const LegalEntityRegistrationForm = ({ formData, onChange }: LegalEntityRegistrationFormProps) => {
  const isPassport = formData.representativeDocumentType === 'passport_rf';
  const isIdCard = formData.representativeDocumentType === 'id_card';
  const isOther = formData.representativeDocumentType === 'other';

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="mb-3 text-base font-semibold text-slate-900">Идентификация клиента</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <RegistrationTextField label="Наименование клиента" value={formData.clientName} onChange={(event) => onChange('clientName', event.target.value)} />
          <RegistrationTextField label="Полное наименование" value={formData.fullName} onChange={(event) => onChange('fullName', event.target.value)} />
          <RegistrationTextField
            label="Английское наименование"
            value={formData.englishName}
            onChange={(event) => onChange('englishName', event.target.value)}
          />
          <RegistrationTextField
            label="Английское наименование полное"
            value={formData.englishFullName}
            onChange={(event) => onChange('englishFullName', event.target.value)}
          />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <RegistrationCheckboxGroup
            label="Родительская компания"
            value={formData.parentCompany}
            options={yesNoOptions}
            onChange={(value) => onChange('parentCompany', value)}
          />
          <RegistrationCheckboxGroup
            label="Квалифицированный инвестор"
            value={formData.qualifiedInvestor}
            options={yesNoOptions}
            onChange={(value) => onChange('qualifiedInvestor', value)}
          />
          <RegistrationCheckboxGroup
            label="Разрешение на использование ДС"
            value={formData.cashPermission}
            options={yesNoOptions}
            onChange={(value) => onChange('cashPermission', value)}
          />
          <RegistrationCheckboxGroup
            label="Разрешение на использование ЦБ"
            value={formData.securitiesPermission}
            options={yesNoOptions}
            onChange={(value) => onChange('securitiesPermission', value)}
          />
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-base font-semibold text-slate-900">Регистрационные данные</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <RegistrationTextField label="ИНН" value={formData.inn} onChange={(event) => onChange('inn', event.target.value)} />
          <RegistrationTextField label="КПП" value={formData.kpp} onChange={(event) => onChange('kpp', event.target.value)} />
          <RegistrationTextField label="ОГРН" value={formData.ogrn} onChange={(event) => onChange('ogrn', event.target.value)} />
          <RegistrationTextField
            label="Дата регистрации"
            type="date"
            value={formData.registrationDate}
            onChange={(event) => onChange('registrationDate', event.target.value)}
          />
          <RegistrationTextField
            label="Регистрирующий орган"
            value={formData.registrationAuthority}
            onChange={(event) => onChange('registrationAuthority', event.target.value)}
          />
          <RegistrationTextField
            label="Уставной капитал"
            value={formData.authorizedCapital}
            onChange={(event) => onChange('authorizedCapital', event.target.value)}
          />
          <RegistrationTextField
            label="Наименование регистратора для АО"
            value={formData.registrarName}
            onChange={(event) => onChange('registrarName', event.target.value)}
          />
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-base font-semibold text-slate-900">Налоговые данные</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <RegistrationTextField label="Наименование налоговой" value={formData.taxName} onChange={(event) => onChange('taxName', event.target.value)} />
          <RegistrationTextField label="Код налоговой" value={formData.taxCode} onChange={(event) => onChange('taxCode', event.target.value)} />
          <RegistrationTextField label="Номер ФСС" value={formData.fssNumber} onChange={(event) => onChange('fssNumber', event.target.value)} />
          <RegistrationTextField label="Номер ПФР" value={formData.pfrNumber} onChange={(event) => onChange('pfrNumber', event.target.value)} />
        </div>
        <div className="mt-3">
          <RegistrationCheckboxGroup
            label="Резидентство"
            value={formData.residency}
            options={yesNoOptions}
            onChange={(value) => onChange('residency', value)}
          />
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-base font-semibold text-slate-900">Контактные данные</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <RegistrationTextField label="Номера телефонов" value={formData.phones} onChange={(event) => onChange('phones', event.target.value)} />
          <RegistrationTextField label="E-mail" value={formData.email} onChange={(event) => onChange('email', event.target.value)} />
          <RegistrationTextField label="Адрес" value={formData.address} onChange={(event) => onChange('address', event.target.value)} />
          <RegistrationTextField
            label="Выгодоприобретатель"
            value={formData.beneficiary}
            onChange={(event) => onChange('beneficiary', event.target.value)}
          />
          <RegistrationTextField
            label="Лица, имеющие право действовать без доверенности"
            value={formData.authorizedPersons}
            onChange={(event) => onChange('authorizedPersons', event.target.value)}
          />
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-base font-semibold text-slate-900">Представитель</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <RegistrationTextField
            label="ФИО представителя"
            value={formData.representativeFullName}
            onChange={(event) => onChange('representativeFullName', event.target.value)}
          />
          <RegistrationTextField
            label="Должность"
            value={formData.representativePosition}
            onChange={(event) => onChange('representativePosition', event.target.value)}
          />
          <RegistrationTextField
            label="Дата рождения"
            type="date"
            value={formData.representativeBirthDate}
            onChange={(event) => onChange('representativeBirthDate', event.target.value)}
          />
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Удостоверяющий документ</span>
            <select
              value={formData.representativeDocumentType}
              onChange={(event) => onChange('representativeDocumentType', event.target.value as RepresentativeDocument['type'])}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="passport_rf">Паспорт РФ</option>
              <option value="id_card">ID</option>
              <option value="other">Иной документ</option>
            </select>
          </label>

          {isOther ? (
            <RegistrationTextField
              label="Наименование документа"
              value={formData.representativeDocumentTitle}
              onChange={(event) => onChange('representativeDocumentTitle', event.target.value)}
            />
          ) : null}

          <RegistrationTextField
            label="Серия"
            value={formData.representativeDocumentSeries}
            onChange={(event) => onChange('representativeDocumentSeries', event.target.value)}
          />
          <RegistrationTextField
            label="Номер"
            value={formData.representativeDocumentNumber}
            onChange={(event) => onChange('representativeDocumentNumber', event.target.value)}
          />

          {!isIdCard ? (
            <RegistrationTextField
              label="Кем выдан"
              value={formData.representativeDocumentIssuedBy}
              onChange={(event) => onChange('representativeDocumentIssuedBy', event.target.value)}
            />
          ) : null}

          <RegistrationTextField
            label="Когда выдан"
            type="date"
            value={formData.representativeDocumentIssuedAt}
            onChange={(event) => onChange('representativeDocumentIssuedAt', event.target.value)}
          />

          {isPassport ? (
            <RegistrationTextField
              label="Код подразделения"
              value={formData.representativeDocumentDivisionCode}
              onChange={(event) => onChange('representativeDocumentDivisionCode', event.target.value)}
            />
          ) : null}
        </div>
      </Card>

      <RegistrationBankAccountsSection accounts={formData.bankAccounts} onChange={(accounts) => onChange('bankAccounts', accounts)} />

      <Card className="p-4">
        <h3 className="mb-3 text-base font-semibold text-slate-900">Коды классификаторов</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <RegistrationTextField label="ОКАТО" value={formData.okato} onChange={(event) => onChange('okato', event.target.value)} />
          <RegistrationTextField label="ОКТМО" value={formData.oktmo} onChange={(event) => onChange('oktmo', event.target.value)} />
          <RegistrationTextField label="ОКПО" value={formData.okpo} onChange={(event) => onChange('okpo', event.target.value)} />
          <RegistrationTextField label="ОКФС" value={formData.okfs} onChange={(event) => onChange('okfs', event.target.value)} />
          <RegistrationTextField label="ОКОГУ" value={formData.okogu} onChange={(event) => onChange('okogu', event.target.value)} />
        </div>
      </Card>
    </div>
  );
};

export type { LegalEntityFormData };
