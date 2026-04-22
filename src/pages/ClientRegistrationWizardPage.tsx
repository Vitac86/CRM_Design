import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { IndividualRegistrationForm, type IndividualFormData } from '../components/crm/registration/IndividualRegistrationForm';
import { LegalEntityRegistrationForm, type LegalEntityFormData } from '../components/crm/registration/LegalEntityRegistrationForm';
import { RegistrationOptionCard } from '../components/crm/registration/RegistrationOptionCard';
import { RegistrationResult } from '../components/crm/registration/RegistrationResult';
import { RegistrationStepHeader } from '../components/crm/registration/RegistrationStepHeader';
import { RegistrationWizardLayout } from '../components/crm/registration/RegistrationWizardLayout';

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
  representative: '',
  beneficiary: '',
  authorizedPersons: '',
  okato: '',
  oktmo: '',
  okpo: '',
  okfs: '',
  okogu: '',
};

export const ClientRegistrationWizardPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [subjectType, setSubjectType] = useState<SubjectType>(null);
  const [registrationMethod, setRegistrationMethod] = useState<RegistrationMethod>(null);
  const [individualForm, setIndividualForm] = useState<IndividualFormData>(initialIndividualForm);
  const [legalEntityForm, setLegalEntityForm] = useState<LegalEntityFormData>(initialLegalEntityForm);
  const [validationError, setValidationError] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [result, setResult] = useState<RegistrationResultState | null>(null);

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

  const handleProceedFromStepThree = () => {
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
    setResult({
      id: `draft-${timestamp}`,
      code: `INV-${String(timestamp).slice(-4)}`,
      registrationDate: new Date().toLocaleDateString('ru-RU'),
    });
    setValidationError('');
    setDraftMessage('');
    setStep(4);
  };

  return (
    <RegistrationWizardLayout step={step}>
      {step === 1 ? (
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
          <div className="mt-5 flex justify-end">
            <Button disabled={!subjectType} onClick={() => setStep(2)}>
              Далее
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
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

          <div className="mt-5 flex flex-wrap justify-between gap-2">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Назад
            </Button>
            <Button disabled={!registrationMethod} onClick={() => setStep(3)}>
              Далее
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
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
            <Button onClick={handleProceedFromStepThree}>Сохранить</Button>
            <Button variant="secondary" onClick={() => setDraftMessage('Черновик сохранён локально')}>
              Сохранить как черновик
            </Button>
            <Button variant="ghost" onClick={() => navigate('/subjects')}>
              Отмена
            </Button>
            <Button variant="secondary" onClick={() => setStep(2)} className="ml-auto">
              Назад
            </Button>
          </div>
        </div>
      ) : null}

      {step === 4 && result ? (
        <RegistrationResult
          subjectTypeLabel={subjectTypeLabel}
          code={result.code}
          displayName={displayName}
          registrationDate={result.registrationDate}
          onFinish={() => navigate('/subjects')}
          onOpenCard={() => navigate('/subjects')}
        />
      ) : null}

      {step === 4 && result ? <p className="mt-2 text-xs text-slate-500">Черновик: {result.id}</p> : null}
    </RegistrationWizardLayout>
  );
};
