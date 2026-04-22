import { Card, Button } from '../../ui';

type RegistrationResultProps = {
  subjectTypeLabel: string;
  code: string;
  displayName: string;
  registrationDate: string;
  onFinish: () => void;
  onOpenCard: () => void;
};

export const RegistrationResult = ({
  subjectTypeLabel,
  code,
  displayName,
  registrationDate,
  onFinish,
  onOpenCard,
}: RegistrationResultProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Результат регистрации субъекта</h2>

      <Card className="border-brand bg-brand-light p-4">
        <p className="font-semibold text-brand-dark">Успешно зарегистрирован</p>
      </Card>

      <Card className="p-4">
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-slate-500">Тип субъекта</dt>
            <dd className="font-medium text-slate-900">{subjectTypeLabel}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Код клиента</dt>
            <dd className="font-mono font-medium text-slate-900">{code}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Наименование / ФИО</dt>
            <dd className="font-medium text-slate-900">{displayName || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Дата регистрации</dt>
            <dd className="font-medium text-slate-900">{registrationDate}</dd>
          </div>
        </dl>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onFinish}>Завершить</Button>
        <Button variant="secondary" onClick={onOpenCard}>
          Открыть карточку
        </Button>
      </div>
    </div>
  );
};
