import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientsStore } from '../app/ClientsStore';
import { Button } from '../components/ui';
import { IndividualRegistrationForm, type IndividualFormData } from '../components/crm/registration/IndividualRegistrationForm';
import { LegalEntityRegistrationForm, type LegalEntityFormData } from '../components/crm/registration/LegalEntityRegistrationForm';
import { RegistrationOptionCard } from '../components/crm/registration/RegistrationOptionCard';
import { RegistrationResult } from '../components/crm/registration/RegistrationResult';
import { RegistrationStepHeader } from '../components/crm/registration/RegistrationStepHeader';
import { RegistrationWizardLayout } from '../components/crm/registration/RegistrationWizardLayout';
import type { Client, ClientType, IndividualClientDetails, LegalRepresentative, ResidencyStatus } from '../data/types';

type SubjectType = 'individual' | 'legal' | null;
type RegistrationMethod = 'manual' | 'cabinet' | 'inn' | null;

type RegistrationResultState = {
  id: string;
  code: string;
  registrationDate: string;
};

const initialIndividualForm: IndividualFormData = {
  lastName: '',
  firstName: '',
  middleName: '',
  birthDate: '',
  birthPlace: '',
  registrationAddress: '',
  actualAddressMatches: '',
  qualifiedInvestor: '',
  cashPermission: '',
  securitiesPermission: '',
  inn: '',
  snils: '',
  phones: '',
  email: '',
  services: '',
  sourceOfFunds: '',
  taxResident: '',
  legalCapacity: '',
  bankAccounts: [],
};

const initialLegalEntityForm: LegalEntityFormData = {
  clientName: '',
  fullName: '',
  englishName: '',
  englishFullName: '',
  parentCompany: '',
  qualifiedInvestor: '',
  cashPermission: '',
  securitiesPermission: '',
  inn: '',
  kpp: '',
  ogrn: '',
  registrationDate: '',
  registrationAuthority: '',
  authorizedCapital: '',
  registrarName: '',
  taxName: '',
  taxCode: '',
  fssNumber: '',
  pfrNumber: '',
  residency: '',
  phones: '',
  email: '',
  address: '',
  beneficiary: '',
  authorizedPersons: '',
  okato: '',
  oktmo: '',
  okpo: '',
  okfs: '',
  okogu: '',
  bankAccounts: [],
  representativeFullName: '',
  representativePosition: '',
  representativeBirthDate: '',
  representativeDocumentType: 'passport_rf',
  representativeDocumentTitle: '',
  representativeDocumentSeries: '',
  representativeDocumentNumber: '',
  representativeDocumentIssuedBy: '',
  representativeDocumentIssuedAt: '',
  representativeDocumentDivisionCode: '',
};

export const ClientRegistrationWizardPage = () => {
  const navigate = useNavigate();
  const { addClient } = useClientsStore();
  const [step, setStep] = useState(1);
  const [subjectType, setSubjectType] = useState<SubjectType>(null);
  const [registrationMethod, setRegistrationMethod] = useState<RegistrationMethod>(null);
  const [individualForm, setIndividualForm] = useState<IndividualFormData>(initialIndividualForm);
  const [legalEntityForm, setLegalEntityForm] = useState<LegalEntityFormData>(initialLegalEntityForm);
  const [validationError, setValidationError] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [result, setResult] = useState<RegistrationResultState | null>(null);

  const resolveResidency = (value: string): ResidencyStatus => (value === 'no' ? 'Нерезидент' : 'Резидент РФ');

  const resolveLegalType = (name: string): ClientType => {
    const normalized = name.trim().toUpperCase();

    if (normalized.startsWith('ПАО')) return 'ПАО';
    if (normalized.startsWith('ЗАО')) return 'ЗАО';
    if (normalized.startsWith('АО')) return 'АО';
    if (normalized.startsWith('ООО')) return 'ООО';

    return 'ООО';
  };

  const resolveIndividualType = (form: IndividualFormData): ClientType => {
    const typeHint = [form.services, form.sourceOfFunds].join(' ').toLowerCase();
    return typeHint.includes('ип') ? 'ИП' : 'ФЛ';
  };

  const resolveLegalCapacity = (value: IndividualFormData['legalCapacity']): IndividualClientDetails['legalCapacity'] => {
    if (value === 'full') return 'Полная';
    if (value === 'limited') return 'Ограниченная';
    if (value === 'none') return 'Недееспособен';
    return '';
  };

  const subjectTypeLabel = useMemo(() => {
    if (subjectType === 'individual') {
      return 'Физическое лицо';
    }

    if (subjectType === 'legal') {
      return 'Юридическое лицо';
    }

    return '—';
  }, [subjectType]);

  const displayName = useMemo(() => {
    if (subjectType === 'individual') {
      return [individualForm.lastName, individualForm.firstName, individualForm.middleName].filter(Boolean).join(' ');
    }

    if (subjectType === 'legal') {
      return legalEntityForm.clientName;
    }

    return '';
  }, [individualForm.firstName, individualForm.lastName, individualForm.middleName, legalEntityForm.clientName, subjectType]);

  const handleIndividualChange = <K extends keyof IndividualFormData>(field: K, value: IndividualFormData[K]) => {
    setIndividualForm((current) => ({ ...current, [field]: value }));
    setValidationError('');
    setDraftMessage('');
  };

  const handleLegalChange = <K extends keyof LegalEntityFormData>(field: K, value: LegalEntityFormData[K]) => {
    setLegalEntityForm((current) => ({ ...current, [field]: value }));
    setValidationError('');
    setDraftMessage('');
  };

  const handleProceedFromStepTwo = () => {
    if (subjectType === 'individual') {
      const hasBase = individualForm.lastName.trim() && individualForm.firstName.trim();
      const hasInnOrPhone = individualForm.inn.trim() || individualForm.phones.trim();

      if (!hasBase || !hasInnOrPhone) {
        setValidationError('Для физического лица заполните фамилию, имя и хотя бы одно из полей: ИНН или телефон.');
        return;
      }
    }

    if (subjectType === 'legal') {
      if (!legalEntityForm.clientName.trim() || !legalEntityForm.inn.trim()) {
        setValidationError('Для юридического лица заполните наименование клиента и ИНН.');
        return;
      }
    }

    const timestamp = Date.now();
    const id = `c-${timestamp}`;
    const code = `INV-${String(timestamp).slice(-6)}`;
    const registrationDate = new Date().toLocaleDateString('ru-RU');
    const now = new Date();
    const updatedAt = `${now.toISOString().slice(0, 10)} ${now.toISOString().slice(11, 16)}`;

    const baseClient: Omit<Client, 'name' | 'lastName' | 'firstName' | 'middleName' | 'inn' | 'birthDate' | 'type' | 'residency' | 'phone' | 'email' | 'address' | 'registrationAddress'> = {
      id,
      code,
      ogrnip: '—',
      subjectStatus: 'Регистрация',
      complianceStatus: 'НА ПРОВЕРКЕ',
      fullDocumentSet: false,
      qualification: false,
      roles: ['Клиент'],
      riskCategory: 'Средний',
      secondaryPhone: '',
      representative: 'Самостоятельно',
      updatedAt,
      canUseMoney: false,
      canUseSecurities: false,
      manager: {
        name: 'Не назначен',
        role: 'Менеджер',
        phone: '',
        email: '',
      },
      agent: {
        name: 'Не назначен',
        company: '—',
        code: `АГ-${String(timestamp).slice(-4)}`,
        phone: '',
        email: '',
      },
      reportDelivery: {
        email: {
          enabled: true,
          address: '',
        },
        personalAccount: {
          enabled: false,
        },
      },
      bankDetails: {
        bankName: 'Не указано',
        bik: '',
        checkingAccount: '',
        correspondentAccount: '',
      },
      bankAccounts: subjectType === 'individual' ? individualForm.bankAccounts : legalEntityForm.bankAccounts,
    };

    const legalRepresentative: LegalRepresentative = {
      fullName: legalEntityForm.representativeFullName.trim(),
      position: legalEntityForm.representativePosition.trim(),
      birthDate: legalEntityForm.representativeBirthDate.trim(),
      document: {
        type: legalEntityForm.representativeDocumentType,
        title: legalEntityForm.representativeDocumentType === 'other' ? legalEntityForm.representativeDocumentTitle.trim() : undefined,
        series: legalEntityForm.representativeDocumentSeries.trim(),
        number: legalEntityForm.representativeDocumentNumber.trim(),
        issuedBy: legalEntityForm.representativeDocumentType === 'id_card' ? '' : legalEntityForm.representativeDocumentIssuedBy.trim(),
        issuedAt: legalEntityForm.representativeDocumentIssuedAt.trim(),
        divisionCode: legalEntityForm.representativeDocumentType === 'passport_rf' ? legalEntityForm.representativeDocumentDivisionCode.trim() : '',
      },
    };

    const client: Client =
      subjectType === 'individual'
        ? {
            ...baseClient,
            name: [individualForm.lastName, individualForm.firstName, individualForm.middleName].filter(Boolean).join(' '),
            lastName: individualForm.lastName.trim(),
            firstName: individualForm.firstName.trim(),
            middleName: individualForm.middleName.trim(),
            inn: individualForm.inn.trim(),
            birthDate: individualForm.birthDate || '—',
            type: resolveIndividualType(individualForm),
            residency: resolveResidency(individualForm.taxResident),
            phone: individualForm.phones.trim(),
            email: individualForm.email.trim(),
            address: individualForm.actualAddressMatches === 'yes' ? individualForm.registrationAddress.trim() : '',
            registrationAddress: {
              country: 'Россия',
              region: '',
              district: '',
              city: '',
              postalCode: '',
              street: individualForm.registrationAddress.trim(),
              house: '',
              building: '',
              apartment: '',
            },
            reportDelivery: {
              ...baseClient.reportDelivery,
              email: {
                enabled: Boolean(individualForm.email.trim()),
                address: individualForm.email.trim(),
              },
            },
            canUseMoney: individualForm.cashPermission === 'yes',
            canUseSecurities: individualForm.securitiesPermission === 'yes',
            qualification: individualForm.qualifiedInvestor === 'yes',
            ogrnip: resolveIndividualType(individualForm) === 'ИП' ? `ОГРНИП-${String(timestamp).slice(-6)}` : '—',
            individualDetails: {
              birthPlace: individualForm.birthPlace.trim(),
              snils: individualForm.snils.trim(),
              actualAddressMatches:
                individualForm.actualAddressMatches === 'yes' ? true : individualForm.actualAddressMatches === 'no' ? false : null,
              services: individualForm.services.trim(),
              sourceOfFunds: individualForm.sourceOfFunds.trim(),
              taxResident: individualForm.taxResident === 'yes' ? true : individualForm.taxResident === 'no' ? false : null,
              legalCapacity: resolveLegalCapacity(individualForm.legalCapacity),
            },
            legalEntityDetails: undefined,
          }
        : {
            ...baseClient,
            name: legalEntityForm.clientName.trim(),
            lastName: '',
            firstName: '',
            middleName: '',
            inn: legalEntityForm.inn.trim(),
            birthDate: '—',
            type: resolveLegalType(legalEntityForm.clientName),
            residency: resolveResidency(legalEntityForm.residency),
            phone: legalEntityForm.phones.trim(),
            email: legalEntityForm.email.trim(),
            address: legalEntityForm.address.trim(),
            representative: legalRepresentative.fullName || 'Самостоятельно',
            registrationAddress: {
              country: 'Россия',
              region: '',
              district: '',
              city: '',
              postalCode: '',
              street: legalEntityForm.address.trim(),
              house: '',
              building: '',
              apartment: '',
            },
            reportDelivery: {
              ...baseClient.reportDelivery,
              email: {
                enabled: Boolean(legalEntityForm.email.trim()),
                address: legalEntityForm.email.trim(),
              },
            },
            canUseMoney: legalEntityForm.cashPermission === 'yes',
            canUseSecurities: legalEntityForm.securitiesPermission === 'yes',
            qualification: legalEntityForm.qualifiedInvestor === 'yes',
            individualDetails: undefined,
            legalEntityDetails: {
              shortName: legalEntityForm.clientName.trim(),
              fullName: legalEntityForm.fullName.trim(),
              englishName: legalEntityForm.englishName.trim(),
              englishFullName: legalEntityForm.englishFullName.trim(),
              parentCompany: legalEntityForm.parentCompany.trim(),
              kpp: legalEntityForm.kpp.trim(),
              ogrn: legalEntityForm.ogrn.trim(),
              registrationDate: legalEntityForm.registrationDate.trim(),
              registrationAuthority: legalEntityForm.registrationAuthority.trim(),
              authorizedCapital: legalEntityForm.authorizedCapital.trim(),
              registrarName: legalEntityForm.registrarName.trim(),
              taxName: legalEntityForm.taxName.trim(),
              taxCode: legalEntityForm.taxCode.trim(),
              fssNumber: legalEntityForm.fssNumber.trim(),
              pfrNumber: legalEntityForm.pfrNumber.trim(),
              beneficiary: legalEntityForm.beneficiary.trim(),
              authorizedPersons: legalEntityForm.authorizedPersons.trim(),
              okato: legalEntityForm.okato.trim(),
              oktmo: legalEntityForm.oktmo.trim(),
              okpo: legalEntityForm.okpo.trim(),
              okfs: legalEntityForm.okfs.trim(),
              okogu: legalEntityForm.okogu.trim(),
              representativeDetails: legalRepresentative.fullName ? legalRepresentative : undefined,
            },
          };

    addClient(client);
    setResult({
      id,
      code,
      registrationDate,
    });
    setValidationError('');
    setDraftMessage('');
    setStep(3);
  };

  return (
    <RegistrationWizardLayout step={step}>
      {step === 1 ? (
        <div>
          <div className="space-y-5">
            <div>
              <RegistrationStepHeader title="Выберите тип субъекта" />
              <div className="grid gap-3 md:grid-cols-2">
                <RegistrationOptionCard
                  title="Физическое лицо"
                  selected={subjectType === 'individual'}
                  onClick={() => {
                    setSubjectType('individual');
                    setValidationError('');
                  }}
                />
                <RegistrationOptionCard
                  title="Юридическое лицо"
                  selected={subjectType === 'legal'}
                  onClick={() => {
                    setSubjectType('legal');
                    setValidationError('');
                  }}
                />
              </div>
            </div>

            <div>
              <RegistrationStepHeader title="Выберите способ" />
              <div className="grid gap-3 md:grid-cols-3">
                <RegistrationOptionCard
                  title="Ручной ввод"
                  description="Основной сценарий заполнения данных клиента."
                  selected={registrationMethod === 'manual'}
                  onClick={() => {
                    setRegistrationMethod('manual');
                    setValidationError('');
                  }}
                />
                <RegistrationOptionCard
                  title="Загрузить из ЛК"
                  description="Скоро будет доступно."
                  selected={registrationMethod === 'cabinet'}
                  onClick={() => {
                    setRegistrationMethod('cabinet');
                    setValidationError('');
                  }}
                />
                <RegistrationOptionCard
                  title="Загрузить по ИНН"
                  description="Скоро будет доступно."
                  selected={registrationMethod === 'inn'}
                  onClick={() => {
                    setRegistrationMethod('inn');
                    setValidationError('');
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <Button disabled={!subjectType || !registrationMethod} onClick={() => setStep(2)}>
              Далее
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div>
          <RegistrationStepHeader title="Заполните данные" />

          {subjectType === 'individual' ? (
            <IndividualRegistrationForm formData={individualForm} onChange={handleIndividualChange} />
          ) : (
            <LegalEntityRegistrationForm formData={legalEntityForm} onChange={handleLegalChange} />
          )}

          {validationError ? <p className="mt-3 text-sm text-red-600">{validationError}</p> : null}
          {draftMessage ? <p className="mt-3 text-sm text-brand-dark">{draftMessage}</p> : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={handleProceedFromStepTwo}>Сохранить</Button>
            <Button variant="secondary" onClick={() => setDraftMessage('Черновик сохранён локально')}>
              Сохранить как черновик
            </Button>
            <Button variant="ghost" onClick={() => navigate('/subjects')}>
              Отмена
            </Button>
            <Button variant="secondary" onClick={() => setStep(1)} className="ml-auto">
              Назад
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 && result ? (
        <RegistrationResult
          subjectTypeLabel={subjectTypeLabel}
          code={result.code}
          displayName={displayName}
          registrationDate={result.registrationDate}
          onFinish={() => navigate('/subjects')}
          onOpenCard={() => navigate(`/subjects/${result.id}`)}
        />
      ) : null}

      {step === 3 && result ? <p className="mt-2 text-xs text-slate-500">ID клиента: {result.id}</p> : null}
    </RegistrationWizardLayout>
  );
};
