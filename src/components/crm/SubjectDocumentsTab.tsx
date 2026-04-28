import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataAccess } from '../../app/dataAccess/useDataAccess';
import type { ClientDocument } from '../../data/types';
import { routes } from '../../routes/paths';
import { Button, DataTable, DownloadIcon, EmptyState, PrintIcon, StatusBadge } from '../ui';

type SubjectDocumentsTabProps = {
  clientId: string;
};

type NewDocumentForm = {
  title: string;
  documentType: string;
  status: ClientDocument['status'] | '';
  date: string;
};

const documentTypeOptions = ['Договор ДУ', 'Депозитарный', 'Анкета', 'Паспорт', 'Доверенность', 'Иной документ'];
const documentStatusOptions: Array<NewDocumentForm['status']> = ['Действующий', 'На подписи', 'Архивный', 'Черновик'];

const defaultForm: NewDocumentForm = {
  title: '',
  documentType: '',
  status: '',
  date: '',
};

export const SubjectDocumentsTab = ({ clientId }: SubjectDocumentsTabProps) => {
  const navigate = useNavigate();
  const { documents: documentsRepository } = useDataAccess();

  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<NewDocumentForm>(defaultForm);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDocuments = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const loadedDocuments = await documentsRepository.listDocumentsByClientId(clientId);

        if (!isMounted) {
          return;
        }

        setDocuments(loadedDocuments);
      } catch {
        if (!isMounted) {
          return;
        }

        setDocuments([]);
        setError('Не удалось загрузить документы клиента.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    setIsCreateOpen(false);
    setFormData(defaultForm);
    setFormError(null);

    void loadDocuments();

    return () => {
      isMounted = false;
    };
  }, [clientId, documentsRepository]);

  const hasDocuments = documents.length > 0;

  const handleOpenCreate = () => {
    setFormData(defaultForm);
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    setFormError(null);
    setFormData(defaultForm);
  };

  const handleSaveDocument = () => {
    if (!formData.title.trim() || !formData.documentType || !formData.status || !formData.date) {
      setFormError('Заполните все обязательные поля.');
      return;
    }

    const nextDocument: ClientDocument = {
      id: `doc-local-${crypto.randomUUID()}`,
      clientId,
      title: formData.title.trim(),
      documentType: formData.documentType,
      status: formData.status,
      date: formData.date,
      fileName: `${formData.title.trim().toLowerCase().replace(/\s+/g, '-')}.pdf`,
    };

    setDocuments((prev) => [nextDocument, ...prev]);
    handleCloseCreate();
  };

  const handlePrintDocument = (documentTitle: string) => {
    window.alert(`Подготовка документа «${documentTitle}» к печати`);
    window.print();
  };

  const sanitizeFileName = (rawName: string) => {
    const transliterationMap: Record<string, string> = {
      а: 'a',
      б: 'b',
      в: 'v',
      г: 'g',
      д: 'd',
      е: 'e',
      ё: 'e',
      ж: 'zh',
      з: 'z',
      и: 'i',
      й: 'y',
      к: 'k',
      л: 'l',
      м: 'm',
      н: 'n',
      о: 'o',
      п: 'p',
      р: 'r',
      с: 's',
      т: 't',
      у: 'u',
      ф: 'f',
      х: 'h',
      ц: 'ts',
      ч: 'ch',
      ш: 'sh',
      щ: 'sch',
      ъ: '',
      ы: 'y',
      ь: '',
      э: 'e',
      ю: 'yu',
      я: 'ya',
    };

    const transliterated = rawName
      .toLowerCase()
      .split('')
      .map((char) => transliterationMap[char] ?? char)
      .join('');

    return transliterated
      .replace(/[^a-z0-9._\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');
  };

  const resolveDownloadFileName = (doc: ClientDocument) => {
    const sourceName = doc.fileName?.trim() || doc.title.trim();
    const normalizedName = sanitizeFileName(sourceName);

    if (!normalizedName) {
      return 'document.txt';
    }

    return /\.[a-z0-9]{2,5}$/i.test(normalizedName) ? normalizedName : `${normalizedName}.txt`;
  };

  const handleDownloadDocument = (doc: ClientDocument) => {
    const fileName = resolveDownloadFileName(doc);
    const content = [
      `Название документа: ${doc.title}`,
      `Тип документа: ${doc.documentType}`,
      `Статус: ${doc.status}`,
      `Дата: ${doc.date}`,
      `Клиент: ${doc.clientId}`,
      '',
      'Это mock-файл, сгенерированный в интерфейсе CRM.',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const table = useMemo(
    () => (
      <DataTable
        columns={[
          { key: 'title', header: 'Название документа', className: 'min-w-[220px] font-medium text-slate-800' },
          { key: 'documentType', header: 'Вид', className: 'min-w-[180px]' },
          {
            key: 'status',
            header: 'Статус',
            className: 'min-w-[160px]',
            render: (row) => <StatusBadge value={row.status} />,
          },
          { key: 'date', header: 'Дата', className: 'min-w-[140px]' },
          {
            key: 'actions',
            header: 'Действия',
            className: 'w-28',
            headerClassName: 'text-right',
            render: (row) => (
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
                  aria-label="Скачать документ"
                  title="Скачать"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDownloadDocument(row);
                  }}
                >
                  <DownloadIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
                  aria-label="Распечатать документ"
                  title="Распечатать"
                  onClick={(event) => {
                    event.stopPropagation();
                    handlePrintDocument(row.title);
                  }}
                >
                  <PrintIcon className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]}
        rows={documents}
      />
    ),
    [documents],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(routes.subjectDocumentWizard(clientId))}>
          Открыть Document Wizard
        </Button>
        <Button onClick={handleOpenCreate}>+ Добавить документ</Button>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {isLoading ? (
        <EmptyState title="Загрузка документов..." description="Пожалуйста, подождите." />
      ) : hasDocuments ? (
        table
      ) : (
        <EmptyState title="Документы отсутствуют" description="Для клиента пока не добавлены документы." />
      )}

      {isCreateOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/35 p-4" role="dialog" aria-modal="true" aria-label="Добавление документа">
          <div className="w-full max-w-xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xl">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900">Новый документ</h3>
              <p className="text-sm text-slate-500">Заполните поля для добавления документа в список субъекта.</p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 sm:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Название документа *</span>
                <input
                  value={formData.title}
                  onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Вид документа *</span>
                <select
                  value={formData.documentType}
                  onChange={(event) => setFormData((prev) => ({ ...prev, documentType: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                >
                  <option value="">Выберите вид</option>
                  {documentTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Статус документа *</span>
                <select
                  value={formData.status}
                  onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value as NewDocumentForm['status'] }))}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                >
                  <option value="">Выберите статус</option>
                  {documentStatusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Дата *</span>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(event) => setFormData((prev) => ({ ...prev, date: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/10 focus:outline-none"
                />
              </label>
            </div>

            {formError ? <p className="mt-3 text-sm text-rose-600">{formError}</p> : null}

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <Button variant="secondary" onClick={handleCloseCreate}>
                Отмена
              </Button>
              <Button onClick={handleSaveDocument}>Сохранить</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
