import { Card } from '../../ui';
import { RegistrationCheckboxGroup } from './RegistrationCheckboxGroup';
import { RegistrationTextField } from './RegistrationTextField';

type IndividualFormData = {
  lastName: string;
  firstName: string;
  middleName: string;
  birthDate: string;
  birthPlace: string;
  registrationAddress: string;
  actualAddressMatches: string;
  qualifiedInvestor: string;
  cashPermission: string;
  securitiesPermission: string;
  inn: string;
  snils: string;
  phones: string;
  email: string;
  services: string;
  sourceOfFunds: string;
  taxResident: string;
  legalCapacity: string;
};

type IndividualRegistrationFormProps = {
  formData: IndividualFormData;
  onChange: <K extends keyof IndividualFormData>(field: K, value: IndividualFormData[K]) => void;
};

const yesNoOptions = [
  { label: 'Да', value: 'yes' },
  { label: 'Нет', value: 'no' },
];

export const IndividualRegistrationForm = ({ formData, onChange }: IndividualRegistrationFormProps) => {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="mb-3 text-base font-semibold text-slate-900">Идентификация клиента</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <RegistrationTextField label="Фамилия" value={formData.lastName} onChange={(event) => onChange('lastName', event.target.value)} />
          <RegistrationTextField label="Имя" value={formData.firstName} onChange={(event) => onChange('firstName', event.target.value)} />
          <RegistrationTextField label="Отчество" value={formData.middleName} onChange={(event) => onChange('middleName', event.target.value)} />
          <RegistrationTextField
            label="Дата рождения"
            type="date"
            value={formData.birthDate}
            onChange={(event) => onChange('birthDate', event.target.value)}
          />
          <RegistrationTextField label="Место рождения" value={formData.birthPlace} onChange={(event) => onChange('birthPlace', event.target.value)} />
          <RegistrationTextField
            label="Адрес регистрации"
            value={formData.registrationAddress}
            onChange={(event) => onChange('registrationAddress', event.target.value)}
          />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <RegistrationCheckboxGroup
            label="Фактический адрес совпадает с местом регистрации"
            value={formData.actualAddressMatches}
            options={yesNoOptions}
            onChange={(value) => onChange('actualAddressMatches', value)}
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
          <RegistrationTextField label="СНИЛС" value={formData.snils} onChange={(event) => onChange('snils', event.target.value)} />
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-base font-semibold text-slate-900">Контактные данные</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <RegistrationTextField label="Номера телефонов" value={formData.phones} onChange={(event) => onChange('phones', event.target.value)} />
          <RegistrationTextField label="E-mail" value={formData.email} onChange={(event) => onChange('email', event.target.value)} />
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-base font-semibold text-slate-900">Дополнительные данные</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <RegistrationTextField label="Услуги" value={formData.services} onChange={(event) => onChange('services', event.target.value)} />
          <RegistrationTextField
            label="Источник средств"
            value={formData.sourceOfFunds}
            onChange={(event) => onChange('sourceOfFunds', event.target.value)}
          />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <RegistrationCheckboxGroup
            label="Налоговый резидент"
            value={formData.taxResident}
            options={yesNoOptions}
            onChange={(value) => onChange('taxResident', value)}
          />
          <RegistrationCheckboxGroup
            label="Дееспособность"
            value={formData.legalCapacity}
            options={[
              { label: 'Полная', value: 'full' },
              { label: 'Ограниченная', value: 'limited' },
              { label: 'Недееспособен', value: 'none' },
            ]}
            onChange={(value) => onChange('legalCapacity', value)}
          />
        </div>
      </Card>
    </div>
  );
};

export type { IndividualFormData };
