import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, EmptyState, FormField, SelectFilter } from '../components/ui';
import { routes } from '../routes/paths';

const requiredDocuments = [
  'Анкета клиента',
  'Паспорт / регистрационные документы',
  'Подтверждение адреса',
  'Форма FATCA/CRS',
] as const;

type DocumentUploadState = {
  id: string;
  title: string;
  uploaded: boolean;
  fileName: string;
  comment: string;
};

const buildInitialDocuments = (): DocumentUploadState[] =>
  requiredDocuments.map((title, index) => ({
    id: `doc-step-${index + 1}`,
    title,
    uploaded: false,
    fileName: '',
    comment: '',
  }));

export const DocumentWizardPage = () => {
  const navigate = useNavigate();
  const params = useParams<{ id?: string; subjectId?: string }>();
  const subjectId = params.id ?? params.subjectId;

  const [step, setStep] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [packageType, setPackageType] = useState('Стартовый KYC-пакет');
  const [verificationChannel, setVerificationChannel] = useState('Комплаенс');
  const [dueDate, setDueDate] = useState('');
  const [documents, setDocuments] = useState<DocumentUploadState[]>(() => buildInitialDocuments());
  const [completionNote, setCompletionNote] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);

  const uploadedCount = useMemo(() => documents.filter((item) => item.uploaded).length, [documents]);
  const isStepOneValid = packageType.trim().length > 0 && verificationChannel.trim().length > 0;
  const isStepTwoValid = uploadedCount > 0;
  const canComplete = isStepOneValid && isStepTwoValid && isConfirmed;

  if (!subjectId) {
    return (
      <div className="min-w-0 space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5">
        <EmptyState title="Субъект не найден" description="Не удалось открыть мастер документов без выбранного клиента." />
        <div>
          <Button variant="secondary" onClick={() => navigate(routes.subjects)}>
            К списку субъектов
          </Button>
        </div>
      </div>
    );
  }

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2200);
  };

  const handleSaveDraft = () => {
    showToast('Черновик мастера документов сохранён');
  };

  const handleNext = () => {
    if (step === 1 && !isStepOneValid) {
      showToast('Заполните обязательные поля шага');
      return;
    }

    if (step === 2 && !isStepTwoValid) {
      showToast('Загрузите минимум один документ для продолжения');
      return;
    }

    setStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    if (step === 1) {
      navigate(`${routes.subject(subjectId)}?tab=documents`);
      return;
    }

    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleComplete = () => {
    if (!canComplete) {
      showToast('Проверьте комплект документов и подтвердите завершение');
      return;
    }

    navigate(`${routes.subject(subjectId)}?tab=documents`, {
      state: { toastMessage: `Document Wizard завершён: загружено ${uploadedCount} из ${documents.length} документов` },
    });
  };

  return (
    <div className="min-w-0 space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5">
      <Card className="space-y-4 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Document Wizard</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Пошаговая загрузка, верификация и подтверждение комплекта документов клиента.</p>
          </div>
          <Button variant="secondary" onClick={() => navigate(`${routes.subject(subjectId)}?tab=documents`)}>
            Назад к документам
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { id: 1, title: 'Параметры пакета' },
            { id: 2, title: 'Загрузка документов' },
            { id: 3, title: 'Проверка и завершение' },
          ].map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border px-3 py-2 text-sm ${step === item.id ? 'border-brand bg-brand/10 text-brand' : 'border-[var(--color-border)] bg-[var(--color-muted-surface)] text-[var(--color-text-secondary)]'}`}
            >
              <p className="text-xs uppercase tracking-wide">Шаг {item.id}</p>
              <p className="font-medium">{item.title}</p>
            </div>
          ))}
        </div>
      </Card>

      {step === 1 ? (
        <Card className="space-y-4 rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Настройка пакета</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[11px] font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">Тип пакета</span>
              <SelectFilter value={packageType} onChange={(event) => setPackageType(event.target.value)} className="sm:w-full">
                <option value="Стартовый KYC-пакет">Стартовый KYC-пакет</option>
                <option value="Расширенный пакет для юр. лица">Расширенный пакет для юр. лица</option>
                <option value="Обновление архивного пакета">Обновление архивного пакета</option>
              </SelectFilter>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">Канал верификации</span>
              <SelectFilter value={verificationChannel} onChange={(event) => setVerificationChannel(event.target.value)} className="sm:w-full">
                <option value="Комплаенс">Комплаенс</option>
                <option value="Мидл-офис">Мидл-офис</option>
                <option value="Ручная проверка куратора">Ручная проверка куратора</option>
              </SelectFilter>
            </label>
            <FormField label="Плановая дата проверки" value={dueDate} onChange={(event) => setDueDate(event.target.value)} type="date" />
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="space-y-4 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Загрузка и статус документов</h2>
            <span className="rounded-full bg-[var(--color-muted-surface)] px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
              Загружено: {uploadedCount} / {documents.length}
            </span>
          </div>
          <div className="space-y-3">
            {documents.map((document) => (
              <div key={document.id} className="grid gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted-surface)] p-3 sm:grid-cols-[1.2fr,1fr,1fr]">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{document.title}</p>
                  <label className="mt-2 inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <input
                      type="checkbox"
                      checked={document.uploaded}
                      onChange={(event) =>
                        setDocuments((prev) =>
                          prev.map((item) =>
                            item.id === document.id
                              ? {
                                  ...item,
                                  uploaded: event.target.checked,
                                  fileName: event.target.checked ? item.fileName : '',
                                }
                              : item,
                          ),
                        )
                      }
                    />
                    <span>Документ загружен</span>
                  </label>
                </div>

                <FormField
                  label="Имя файла"
                  placeholder="passport_client.pdf"
                  value={document.fileName}
                  onChange={(event) =>
                    setDocuments((prev) =>
                      prev.map((item) =>
                        item.id === document.id
                          ? { ...item, fileName: event.target.value, uploaded: event.target.value.trim().length > 0 }
                          : item,
                      ),
                    )
                  }
                />

                <FormField
                  label="Комментарий"
                  placeholder="Комментарий проверки"
                  value={document.comment}
                  onChange={(event) =>
                    setDocuments((prev) =>
                      prev.map((item) => (item.id === document.id ? { ...item, comment: event.target.value } : item)),
                    )
                  }
                />
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className="space-y-4 rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Проверка комплекта и подтверждение</h2>

          <div className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted-surface)] p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Тип пакета</p>
              <p className="font-medium text-[var(--color-text-primary)]">{packageType}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Канал верификации</p>
              <p className="font-medium text-[var(--color-text-primary)]">{verificationChannel}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Плановая дата</p>
              <p className="font-medium text-[var(--color-text-primary)]">{dueDate || 'Не указана'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Статус загрузки</p>
              <p className="font-medium text-[var(--color-text-primary)]">{uploadedCount} из {documents.length} документов</p>
            </div>
          </div>

          <FormField
            label="Комментарий к завершению"
            value={completionNote}
            onChange={(event) => setCompletionNote(event.target.value)}
            placeholder="Финальные примечания по пакету"
          />

          <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <input type="checkbox" checked={isConfirmed} onChange={(event) => setIsConfirmed(event.target.checked)} />
            <span>Подтверждаю корректность пакета и готовность к финальной проверке</span>
          </label>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="secondary" onClick={handleBack}>
          Назад
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={handleSaveDraft}>
            Сохранить черновик
          </Button>
          {step < 3 ? <Button onClick={handleNext}>Далее</Button> : <Button onClick={handleComplete}>Завершить</Button>}
        </div>
      </div>

      {toastMessage ? <p className="text-sm text-[var(--color-text-secondary)]">{toastMessage}</p> : null}
    </div>
  );
};
