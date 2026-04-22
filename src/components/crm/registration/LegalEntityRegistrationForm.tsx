import { Card } from '../../ui';
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
  representative: string;
  beneficiary: string;
  authorizedPersons: string;
  okato: string;
  oktmo: string;
  okpo: string;
  okfs: string;
  okogu: string;
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
            label="Представитель"
            value={formData.representative}
            onChange={(event) => onChange('representative', event.target.value)}
          />
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
