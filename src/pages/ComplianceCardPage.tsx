import { useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useDataAccess } from '../app/dataAccess/useDataAccess';
import { Badge, Button, Card, EmptyState } from '../components/ui';
import { ProfileField } from '../components/crm/ProfileField';
import { AsyncContent } from '../shared/ui/async';
import type { Client, ClientDocument, ClientRelation, ComplianceCase, ComplianceStatus, IndividualComplianceCard, LegalEntityComplianceCard } from '../data/types';
import {
  formatClientType,
  formatComplianceStatus,
  formatResidency,
  getClientTypeBadgeVariant,
  getComplianceBadgeVariant,
} from '../utils/labels';

type DecisionStatus = Extract<ComplianceStatus, 'ПРОЙДЕН' | 'НА ДОРАБОТКЕ' | 'ЗАБЛОКИРОВАН'>;

type SectionField = {
  label: string;
  value?: string | null;
  mono?: boolean;
};

const decisionOptions: Array<{ value: DecisionStatus; label: string; variant: 'primary' | 'secondary' | 'danger' }> = [
  { value: 'ПРОЙДЕН', label: 'Одобрить', variant: 'primary' },
  { value: 'НА ДОРАБОТКЕ', label: 'На доработку', variant: 'secondary' },
  { value: 'ЗАБЛОКИРОВАН', label: 'Заблокировать', variant: 'danger' },
];

const documentProblemStatuses = ['На проверке', 'Отклонена', 'Не действующий', 'Черновик'];

const renderFields = (fields: SectionField[]) =>
  fields.map((field) => (
    <ProfileField key={field.label} label={field.label} value={field.value?.trim() ? field.value : '—'} mono={field.mono} />
  ));

const SectionCard = ({ title, children }: { title: string; children: ReactNode }) => (
  <Card className="space-y-4 p-4 sm:p-5">
    <h2 className="text-base font-semibold text-slate-900">{title}</h2>
    {children}
  </Card>
);

export const ComplianceCardPage = () => {
  const { id } = useParams();
  const {
    clients: clientsRepository,
    compliance: complianceRepository,
    documents: documentsRepository,
    relations: relationsRepository,
  } = useDataAccess();

  const [client, setClient] = useState<Client | null>(null);
  const [complianceCase, setComplianceCase] = useState<ComplianceCase | null>(null);
  const [legalCard, setLegalCard] = useState<LegalEntityComplianceCard | null>(null);
  const [individualCard, setIndividualCard] = useState<IndividualComplianceCard | null>(null);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [relations, setRelations] = useState<ClientRelation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentStatus, setCurrentStatus] = useState<ComplianceStatus>('НА ПРОВЕРКЕ');
  const [selectedDecision, setSelectedDecision] = useState<DecisionStatus>('ПРОЙДЕН');
  const [commentDraft, setCommentDraft] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);


  useEffect(() => {
    let isMounted = true;

    const loadCard = async () => {
      if (!id) {
        if (isMounted) {
          setClient(null);
          setComplianceCase(null);
          setLegalCard(null);
          setIndividualCard(null);
          setDocuments([]);
          setRelations([]);
          setIsLoading(false);
          setError(null);
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const loadedClient = await clientsRepository.getClientById(id);

        if (!isMounted) {
          return;
        }

        if (!loadedClient) {
          setClient(null);
          setComplianceCase(null);
          setLegalCard(null);
          setIndividualCard(null);
          setDocuments([]);
          setRelations([]);
          return;
        }

        const [loadedComplianceCase, loadedLegalCard, loadedIndividualCard, loadedDocuments, loadedRelations] = await Promise.all([
          complianceRepository.getComplianceCaseByClientId(loadedClient.id),
          complianceRepository.getLegalEntityComplianceCardByClientId(loadedClient.id),
          complianceRepository.getIndividualComplianceCardByClientId(loadedClient.id),
          documentsRepository.listDocumentsByClientId(loadedClient.id),
          relationsRepository.listRelationsByClientId(loadedClient.id),
        ]);

        if (!isMounted) {
          return;
        }

        setClient(loadedClient);
        setComplianceCase(loadedComplianceCase);
        setLegalCard(loadedLegalCard);
        setIndividualCard(loadedIndividualCard);
        setDocuments(loadedDocuments);
        setRelations(loadedRelations);
      } catch {
        if (!isMounted) {
          return;
        }

        setError('Не удалось загрузить карточку комплаенса.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadCard();

    return () => {
      isMounted = false;
    };
  }, [
    id,
    clientsRepository,
    complianceRepository,
    documentsRepository,
    relationsRepository,
  ]);

  useEffect(() => {
    if (!client) {
      return;
    }

    setCurrentStatus(client.complianceStatus);
    setSelectedDecision(client.complianceStatus === 'НА ПРОВЕРКЕ' ? 'ПРОЙДЕН' : client.complianceStatus);
    setCommentDraft(client.complianceComment ?? complianceCase?.comment ?? '');
    setCommentError(null);
  }, [client, complianceCase]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setToastMessage(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  if (!isLoading && !error && !client) {
    return (
      <EmptyState
        title="Карточка не найдена"
        description="Проверьте идентификатор клиента в адресной строке или выберите запись из списка комплаенса."
      />
    );
  }

  if (isLoading || error) {
    return (
      <AsyncContent
        isLoading={isLoading}
        error={error}
        loadingFallback={<EmptyState title="Загрузка..." description="Загружаем карточку комплаенса." />}
        errorFallback={error ? <EmptyState title="Ошибка загрузки" description={error} /> : undefined}
      >
        <div />
      </AsyncContent>
    );
  }

  if (!client) {
    return null;
  }

  const isIndividual = client.type === 'ФЛ' || client.type === 'ИП';
  const representativeDetails = client.legalEntityDetails?.representativeDetails;
  const beneficiaryRelation = relations.find((item) => item.role === 'Бенефициар');
  const representativeRelation = relations.find((item) => item.role === 'Представитель');
  const authorizedPersons = [
    client.legalEntityDetails?.authorizedPersons,
    ...relations.filter((item) => item.role === 'Исполнительный орган').map((item) => item.relatedName),
  ]
    .filter(Boolean)
    .join(', ');

  const primaryAccount = client.bankAccounts?.find((account) => account.isPrimary) ?? client.bankAccounts?.[0];
  const additionalAccountsCount = Math.max((client.bankAccounts?.length ?? 0) - (primaryAccount ? 1 : 0), 0);

  const problematicDocuments = documents.filter((document) => documentProblemStatuses.includes(document.status));
  const keyDocuments = documents.slice(0, 4);

  const shouldRequireComment = selectedDecision === 'НА ДОРАБОТКЕ' || selectedDecision === 'ЗАБЛОКИРОВАН';
  const shouldShowCommentBox = shouldRequireComment || currentStatus === 'НА ДОРАБОТКЕ' || currentStatus === 'ЗАБЛОКИРОВАН';

  const applyFinalDecision = async () => {
    const trimmedComment = commentDraft.trim();

    if (shouldRequireComment && !trimmedComment) {
      setCommentError(
        selectedDecision === 'ЗАБЛОКИРОВАН'
          ? 'Укажите основание блокировки'
          : 'Введите комментарий для доработки',
      );
      return;
    }

    const updatedClient = await clientsRepository.updateClient(client.id, {
      complianceStatus: selectedDecision,
      complianceComment: trimmedComment || undefined,
      complianceOfficer: client.complianceOfficer ?? complianceCase?.analyst,
      complianceDate: new Date().toISOString().slice(0, 10),
    });

    if (!updatedClient) {
      setToastMessage('Не удалось сохранить финальное решение.');
      return;
    }

    setClient(updatedClient);
    setCurrentStatus(updatedClient.complianceStatus);
    setCommentError(null);
    setToastMessage(`Финальное решение принято. Новый статус: ${formatComplianceStatus(selectedDecision)}.`);
  };

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-700">
            {client.name
              .split(' ')
              .slice(0, 2)
              .map((part) => part[0])
              .join('')}
          </div>

          <div className="min-w-[220px] flex-1 space-y-2">
            <h1 className="text-xl font-semibold text-slate-900">{client.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="font-mono text-[13px]">{client.code}</span>
              <Badge variant={getClientTypeBadgeVariant(client.type)}>{formatClientType(client.type)}</Badge>
              <Badge variant={getComplianceBadgeVariant(currentStatus)}>{formatComplianceStatus(currentStatus)}</Badge>
              <Badge variant="neutral">{formatResidency(client.residency)}</Badge>
              <Badge variant={client.qualification ? 'success' : 'neutral'}>
                {client.qualification ? 'Квалифицированный инвестор' : 'Неквалифицированный инвестор'}
              </Badge>
              <Badge variant={client.riskCategory === 'Высокий' || client.riskCategory === 'Повышенный' ? 'warning' : 'neutral'}>
                Риск: {client.riskCategory}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2 xl:grid-cols-3">
          <ProfileField label="Представитель" value={client.representative || representativeRelation?.relatedName || '—'} />
          <ProfileField label="Статус комплаенса" value={formatComplianceStatus(currentStatus)} />
          <ProfileField label="Последнее обновление" value={client.complianceDate ?? complianceCase?.lastCheckAt ?? client.updatedAt} />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <SectionCard title="Идентификация клиента">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {isIndividual
                ? renderFields([
                    { label: 'Код клиента', value: client.code, mono: true },
                    { label: 'Фамилия', value: client.lastName },
                    { label: 'Имя', value: client.firstName },
                    { label: 'Отчество', value: client.middleName },
                    { label: 'Дата рождения', value: client.birthDate },
                    { label: 'Место рождения', value: client.individualDetails?.birthPlace },
                    { label: 'Тип клиента', value: formatClientType(client.type) },
                    { label: 'ИНН', value: client.inn, mono: true },
                    { label: 'СНИЛС', value: client.individualDetails?.snils, mono: true },
                    { label: 'ОГРНИП', value: client.type === 'ИП' ? client.ogrnip : '—', mono: true },
                    { label: 'Резидентство', value: formatResidency(client.residency) },
                    { label: 'Признак инвестора', value: client.qualification ? 'Квалифицированный' : 'Неквалифицированный' },
                    { label: 'Полный комплект документов', value: client.fullDocumentSet ? 'Да' : 'Нет' },
                  ])
                : renderFields([
                    { label: 'Код клиента', value: client.code, mono: true },
                    { label: 'Наименование клиента', value: client.name },
                    { label: 'Полное наименование', value: client.legalEntityDetails?.fullName },
                    { label: 'Английское наименование', value: client.legalEntityDetails?.englishName },
                    { label: 'Полное английское наименование', value: client.legalEntityDetails?.englishFullName },
                    { label: 'Тип клиента', value: formatClientType(client.type) },
                    { label: 'ИНН', value: client.inn, mono: true },
                    { label: 'КПП', value: client.legalEntityDetails?.kpp ?? legalCard?.kpp, mono: true },
                    { label: 'ОГРН', value: client.legalEntityDetails?.ogrn ?? legalCard?.ogrn, mono: true },
                    { label: 'Дата регистрации', value: client.legalEntityDetails?.registrationDate ?? legalCard?.registrationDate },
                    { label: 'Резидентство', value: formatResidency(client.residency) },
                    { label: 'Признак инвестора', value: client.qualification ? 'Квалифицированный' : 'Неквалифицированный' },
                    { label: 'Родительская компания', value: client.legalEntityDetails?.parentCompany },
                    { label: 'Полный комплект документов', value: client.fullDocumentSet ? 'Да' : 'Нет' },
                  ])}
            </div>
          </SectionCard>

          <SectionCard title="Контактные данные">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {renderFields([
                { label: 'Номера телефонов', value: [client.phone, client.secondaryPhone].filter(Boolean).join(', ') },
                { label: 'E-mail', value: client.email },
                { label: 'Страна', value: client.registrationAddress.country },
                { label: 'Регион', value: client.registrationAddress.region },
                { label: 'Город', value: client.registrationAddress.city },
                { label: 'Улица', value: client.registrationAddress.street },
                { label: 'Дом', value: client.registrationAddress.house },
                { label: 'Корпус', value: client.registrationAddress.building },
                { label: 'Квартира / офис / помещение', value: client.registrationAddress.apartment },
                { label: 'Индекс', value: client.registrationAddress.postalCode, mono: true },
              ])}
            </div>
          </SectionCard>

          <SectionCard title="Представители и бенефициары">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {renderFields([
                { label: 'Представитель', value: client.representative || representativeRelation?.relatedName },
                { label: 'Должность представителя', value: representativeDetails?.position ?? (isIndividual ? '—' : 'Генеральный директор') },
                { label: 'Дата рождения представителя', value: representativeDetails?.birthDate },
                {
                  label: 'Тип удостоверяющего документа',
                  value: representativeDetails?.document.type
                    ? representativeDetails.document.type === 'passport_rf'
                      ? 'Паспорт РФ'
                      : representativeDetails.document.type === 'id_card'
                        ? 'ID-карта'
                        : representativeDetails.document.title ?? 'Иной документ'
                    : isIndividual
                      ? 'Паспорт РФ'
                      : undefined,
                },
                {
                  label: 'Данные документа',
                  value: representativeDetails?.document.series
                    ? `${representativeDetails.document.series} ${representativeDetails.document.number}`
                    : individualCard?.passportMasked,
                },
                { label: 'Выгодоприобретатель', value: client.legalEntityDetails?.beneficiary ?? beneficiaryRelation?.relatedName },
                {
                  label: 'Бенефициарный владелец',
                  value: isIndividual ? client.name : legalCard?.beneficiaries.join(', ') || client.legalEntityDetails?.beneficiary,
                },
                { label: 'Лица, имеющие право действовать без доверенности', value: isIndividual ? 'Клиент' : authorizedPersons },
              ])}
            </div>
          </SectionCard>

          <SectionCard title="Банковские реквизиты">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {renderFields([
                { label: 'Банк', value: primaryAccount?.bankName ?? client.bankDetails.bankName },
                { label: 'БИК', value: primaryAccount?.bik ?? client.bankDetails.bik, mono: true },
                {
                  label: 'Корреспондентский счёт',
                  value: primaryAccount?.correspondentAccount ?? client.bankDetails.correspondentAccount,
                  mono: true,
                },
                {
                  label: 'Расчётный счёт',
                  value: primaryAccount?.accountNumber ?? client.bankDetails.checkingAccount,
                  mono: true,
                },
                { label: 'Валюта счёта', value: primaryAccount?.currency ?? 'RUB' },
                { label: 'Назначение / тип счёта', value: primaryAccount?.purpose ?? 'Основной расчётный счёт' },
                {
                  label: 'Другие счета',
                  value: additionalAccountsCount > 0 ? `${additionalAccountsCount} (показать все счета)` : 'Нет',
                },
              ])}
            </div>
          </SectionCard>

          {!isIndividual && (
            <SectionCard title="Коды классификаторов">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {renderFields([
                  { label: 'ОКАТО', value: client.legalEntityDetails?.okato, mono: true },
                  { label: 'ОКТМО', value: client.legalEntityDetails?.oktmo, mono: true },
                  { label: 'ОКПО', value: client.legalEntityDetails?.okpo, mono: true },
                  { label: 'ОКОПФ', value: client.type, mono: true },
                  { label: 'ОКФС', value: client.legalEntityDetails?.okfs, mono: true },
                  { label: 'ОКВЭД / основной вид деятельности', value: legalCard?.activity ?? '—' },
                  { label: 'ОКОГУ', value: client.legalEntityDetails?.okogu, mono: true },
                ])}
              </div>
            </SectionCard>
          )}

          <SectionCard title="Финансовый профиль">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {renderFields([
                { label: 'Источник средств', value: client.individualDetails?.sourceOfFunds ?? individualCard?.incomeSource ?? legalCard?.riskNote },
                {
                  label: 'Налоговый резидент',
                  value: client.individualDetails?.taxResident === null ? formatResidency(client.residency) : client.individualDetails?.taxResident ? 'Да' : 'Нет',
                },
                { label: 'Наименование налоговой', value: client.legalEntityDetails?.taxName ?? '—' },
                { label: 'Код налоговой', value: client.legalEntityDetails?.taxCode ?? '—', mono: true },
                { label: 'Категория риска', value: client.riskCategory },
                { label: 'Комментарий риск-профиля', value: individualCard?.riskNote ?? legalCard?.riskNote },
              ])}
            </div>
          </SectionCard>

          <SectionCard title="Документы и комплектность">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {renderFields([
                  { label: 'Полный комплект документов', value: client.fullDocumentSet ? 'Да' : 'Нет' },
                  { label: 'Ключевые документы', value: keyDocuments.length ? keyDocuments.map((document) => document.title).join('; ') : '—' },
                  {
                    label: 'Статусы ключевых документов',
                    value: keyDocuments.length
                      ? keyDocuments.map((document) => `${document.title}: ${document.status}`).join('; ')
                      : '—',
                  },
                  {
                    label: 'Что отсутствует',
                    value: client.fullDocumentSet ? '—' : problematicDocuments.length ? 'Часть KYC-документов требует дозагрузки' : 'Требуется загрузка базового комплекта',
                  },
                  {
                    label: 'Что требует уточнения',
                    value: problematicDocuments.length
                      ? problematicDocuments.map((document) => document.title).join('; ')
                      : '—',
                  },
                ])}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Права и разрешения">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {renderFields([
                { label: 'Право использования денежных средств', value: client.canUseMoney ? 'Разрешено' : 'Ограничено' },
                { label: 'Право использования ценных бумаг', value: client.canUseSecurities ? 'Разрешено' : 'Ограничено' },
                { label: 'Иные разрешения', value: client.roles.length > 1 ? client.roles.join(', ') : '—' },
              ])}
            </div>
          </SectionCard>

          <SectionCard title="Комплаенс-кейс">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {renderFields([
                { label: 'Текущий статус комплаенса', value: formatComplianceStatus(currentStatus) },
                { label: 'Причина проверки', value: complianceCase?.reviewReason ?? 'Плановая проверка профиля' },
                { label: 'REP-флаг', value: complianceCase?.pepFlag ? 'Да' : 'Нет' },
                { label: 'Санкционный флаг', value: complianceCase?.sanctionsFlag ? 'Да' : 'Нет' },
                { label: 'Аналитик / комплаенс-офицер', value: client.complianceOfficer ?? complianceCase?.analyst ?? '—' },
                { label: 'Дата начала проверки', value: complianceCase?.lastCheckAt?.slice(0, 10) ?? client.updatedAt.slice(0, 10) },
                { label: 'Дата последнего обновления', value: client.complianceDate ?? complianceCase?.lastCheckAt ?? client.updatedAt },
                { label: 'Комментарий комплаенса', value: client.complianceComment ?? complianceCase?.comment },
                {
                  label: 'Основание для доработки / блокировки / одобрения',
                  value: client.complianceComment ?? 'Основание не зафиксировано',
                },
              ])}
            </div>
          </SectionCard>
        </div>

        <Card className="h-fit space-y-4 p-4 sm:sticky sm:top-4">
          <p className="text-sm font-semibold text-slate-900">Панель принятия решения</p>

          <div className="space-y-2">
            {decisionOptions.map((option) => (
              <Button
                key={option.value}
                variant={selectedDecision === option.value ? option.variant : 'secondary'}
                className="w-full justify-start"
                onClick={() => {
                  setSelectedDecision(option.value);
                  setCommentError(null);
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {shouldShowCommentBox && (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <label htmlFor="decision-comment" className="text-sm font-medium text-slate-800">
                Комментарий комплаенса
              </label>
              <textarea
                id="decision-comment"
                value={commentDraft}
                onChange={(event) => {
                  setCommentDraft(event.target.value);
                  if (commentError) {
                    setCommentError(null);
                  }
                }}
                className="min-h-24 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
                placeholder={selectedDecision === 'ЗАБЛОКИРОВАН' ? 'Укажите причину блокировки' : 'Укажите комментарий'}
              />
              {commentError && <p className="text-xs text-red-600">{commentError}</p>}
            </div>
          )}

          <Button className="w-full" onClick={() => void applyFinalDecision()}>
            Принять финальное решение
          </Button>

          <div className="space-y-1 border-t border-slate-200 pt-3 text-xs text-slate-500">
            <p>Текущее решение: {formatComplianceStatus(currentStatus)}</p>
            <p>Офицер: {client.complianceOfficer ?? complianceCase?.analyst ?? '—'}</p>
            <p>Обновлено: {client.complianceDate ?? complianceCase?.lastCheckAt ?? '—'}</p>
          </div>
        </Card>
      </div>

      {toastMessage && (
        <div className="fixed bottom-4 right-6 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          {toastMessage}
        </div>
      )}
      </div>
  );
};
