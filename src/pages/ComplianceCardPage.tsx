import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useClientsStore } from '../app/ClientsStore';
import { Badge, Button, Card, EmptyState, Tabs } from '../components/ui';
import {
  getComplianceCaseByClientId,
  getIndividualComplianceCardByClientId,
  getLegalEntityComplianceCardByClientId,
} from '../data/compliance';
import type { ComplianceStatus } from '../data/types';
import {
  formatClientType,
  formatComplianceStatus,
  formatResidency,
  getClientTypeBadgeVariant,
  getComplianceBadgeVariant,
} from '../utils/labels';

type DecisionStatus = Extract<ComplianceStatus, 'ПРОЙДЕН' | 'НА ДОРАБОТКЕ' | 'ЗАБЛОКИРОВАН'>;
type CardTab = 'profile' | 'data';

const decisionOptions: Array<{ value: DecisionStatus; label: string; variant: 'primary' | 'secondary' | 'danger' }> = [
  { value: 'ПРОЙДЕН', label: 'Одобрить', variant: 'primary' },
  { value: 'НА ДОРАБОТКЕ', label: 'На доработку', variant: 'secondary' },
  { value: 'ЗАБЛОКИРОВАН', label: 'Заблокировать', variant: 'danger' },
];

export const ComplianceCardPage = () => {
  const { id } = useParams();
  const { getClientById, updateClient } = useClientsStore();

  const client = useMemo(() => (id ? getClientById(id) : undefined), [id]);
  const complianceCase = useMemo(() => (client ? getComplianceCaseByClientId(client.id) : undefined), [client]);
  const legalCard = useMemo(() => (client ? getLegalEntityComplianceCardByClientId(client.id) : undefined), [client]);
  const individualCard = useMemo(() => (client ? getIndividualComplianceCardByClientId(client.id) : undefined), [client]);

  const [activeTab, setActiveTab] = useState<CardTab>('profile');
  const [currentStatus, setCurrentStatus] = useState<ComplianceStatus>('НА ПРОВЕРКЕ');
  const [selectedDecision, setSelectedDecision] = useState<DecisionStatus>('ПРОЙДЕН');
  const [isReworkCommentOpen, setIsReworkCommentOpen] = useState(false);
  const [reworkComment, setReworkComment] = useState('');
  const [reworkCommentError, setReworkCommentError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!client) {
      return;
    }

    setCurrentStatus(client.complianceStatus);
    setSelectedDecision(client.complianceStatus === 'НА ПРОВЕРКЕ' ? 'ПРОЙДЕН' : client.complianceStatus);
    setReworkComment(client.complianceComment ?? complianceCase?.comment ?? '');
    setIsReworkCommentOpen(false);
    setReworkCommentError(null);
  }, [client, complianceCase]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setToastMessage(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  if (!client) {
    return (
      <EmptyState
        title="Карточка не найдена"
        description="Проверьте идентификатор клиента в адресной строке или выберите запись из списка комплаенса."
      />
    );
  }

  const isEntity = client.type !== 'ФЛ' && client.type !== 'ИП';

  const applyFinalDecision = () => {
    if (!client) {
      return;
    }

    setCurrentStatus(selectedDecision);
    updateClient(client.id, {
      complianceStatus: selectedDecision,
    });
    setToastMessage(`Финальное решение принято. Новый статус: ${formatComplianceStatus(selectedDecision)}.`);
  };

  const handleDecisionClick = (decision: DecisionStatus) => {
    setSelectedDecision(decision);
    if (decision === 'НА ДОРАБОТКЕ') {
      setReworkComment(client.complianceComment ?? complianceCase?.comment ?? '');
      setReworkCommentError(null);
      setIsReworkCommentOpen(true);
      return;
    }

    setIsReworkCommentOpen(false);
    setReworkCommentError(null);
  };

  const handleReworkCommentSave = () => {
    if (!client) {
      return;
    }

    const trimmedComment = reworkComment.trim();
    if (!trimmedComment) {
      setReworkCommentError('Введите комментарий для доработки');
      return;
    }

    updateClient(client.id, {
      complianceStatus: 'НА ДОРАБОТКЕ',
      complianceComment: trimmedComment,
    });
    setCurrentStatus('НА ДОРАБОТКЕ');
    setSelectedDecision('НА ДОРАБОТКЕ');
    setReworkComment(trimmedComment);
    setReworkCommentError(null);
    setIsReworkCommentOpen(false);
    setToastMessage('Комментарий сохранён');
  };

  const handleReworkCommentCancel = () => {
    setReworkComment(client.complianceComment ?? complianceCase?.comment ?? '');
    setReworkCommentError(null);
    setIsReworkCommentOpen(false);
  };

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <Card className="flex flex-wrap items-center gap-4 p-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-700">
          {client.name
            .split(' ')
            .slice(0, 2)
            .map((part) => part[0])
            .join('')}
        </div>

        <div className="min-w-[220px] space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">{client.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>{client.code}</span>
            <Badge variant={getClientTypeBadgeVariant(client.type)}>{formatClientType(client.type)}</Badge>
            <Badge variant={getComplianceBadgeVariant(currentStatus)}>{formatComplianceStatus(currentStatus)}</Badge>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="space-y-4 p-4">
          <Tabs
            items={[
              { value: 'profile', label: 'Профиль' },
              { value: 'data', label: 'Данные' },
            ]}
            value={activeTab}
            onChange={(value) => setActiveTab(value as CardTab)}
          />

          {activeTab === 'profile' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="space-y-3 p-4">
                <p className="text-sm font-semibold text-slate-900">Базовые данные</p>
                <p className="text-sm text-slate-700">ИНН: {client.inn}</p>
                <p className="text-sm text-slate-700">Резидентство: {formatResidency(client.residency)}</p>
                <p className="text-sm text-slate-700">Полный комплект: {client.fullDocumentSet ? 'Да' : 'Нет'}</p>
                <p className="text-sm text-slate-700">Телефон: {client.phone}</p>
                <p className="text-sm text-slate-700">Email: {client.email}</p>
              </Card>

              <Card className="space-y-3 p-4">
                <p className="text-sm font-semibold text-slate-900">Комплаенс-кейс</p>
                <p className="text-sm text-slate-700">Причина проверки: {complianceCase?.reviewReason ?? '—'}</p>
                <p className="text-sm text-slate-700">PEP-флаг: {complianceCase?.pepFlag ? 'Да' : 'Нет'}</p>
                <p className="text-sm text-slate-700">Санкционный флаг: {complianceCase?.sanctionsFlag ? 'Да' : 'Нет'}</p>
                <p className="text-sm text-slate-700">Аналитик: {complianceCase?.analyst ?? '—'}</p>
                <p className="text-sm text-slate-700">
                  Комментарий:{' '}
                  <span className={client.complianceComment || complianceCase?.comment ? 'text-slate-800' : 'text-slate-500'}>
                    {client.complianceComment ?? complianceCase?.comment ?? '—'}
                  </span>
                </p>
              </Card>
            </div>
          ) : isEntity ? (
            <Card className="space-y-2 p-4">
              <p className="text-sm font-semibold text-slate-900">Данные организации</p>
              <p className="text-sm text-slate-700">ОГРН: {legalCard?.ogrn ?? '—'}</p>
              <p className="text-sm text-slate-700">КПП: {legalCard?.kpp ?? '—'}</p>
              <p className="text-sm text-slate-700">Дата регистрации: {legalCard?.registrationDate ?? '—'}</p>
              <p className="text-sm text-slate-700">Директор: {legalCard?.director ?? client.representative}</p>
              <p className="text-sm text-slate-700">Вид деятельности: {legalCard?.activity ?? '—'}</p>
              <p className="text-sm text-slate-700">Бенефициары: {legalCard?.beneficiaries.join(', ') ?? '—'}</p>
              <p className="text-sm text-slate-700">Риск-заметка: {legalCard?.riskNote ?? '—'}</p>
            </Card>
          ) : (
            <Card className="space-y-2 p-4">
              <p className="text-sm font-semibold text-slate-900">Данные физлица</p>
              <p className="text-sm text-slate-700">ФИО: {client.lastName} {client.firstName} {client.middleName}</p>
              <p className="text-sm text-slate-700">Паспорт: {individualCard?.passportMasked ?? '—'}</p>
              <p className="text-sm text-slate-700">Дата рождения: {individualCard?.birthDate ?? client.birthDate}</p>
              <p className="text-sm text-slate-700">Гражданство: {individualCard?.citizenship ?? 'Россия'}</p>
              <p className="text-sm text-slate-700">Налоговое резидентство: {individualCard?.taxResidenceCountry ?? 'Россия'}</p>
              <p className="text-sm text-slate-700">Источник дохода: {individualCard?.incomeSource ?? '—'}</p>
              <p className="text-sm text-slate-700">Риск-заметка: {individualCard?.riskNote ?? '—'}</p>
            </Card>
          )}
        </Card>

        <Card className="h-fit space-y-4 p-4">
          <p className="text-sm font-semibold text-slate-900">Комплаенс</p>

          <div className="space-y-2">
            {decisionOptions.map((option) => (
              <Button
                key={option.value}
                variant={selectedDecision === option.value ? option.variant : 'secondary'}
                className="w-full justify-start"
                onClick={() => handleDecisionClick(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {isReworkCommentOpen && (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <label htmlFor="rework-comment" className="text-sm font-medium text-slate-800">
                Комментарий
              </label>
              <textarea
                id="rework-comment"
                value={reworkComment}
                onChange={(event) => {
                  setReworkComment(event.target.value);
                  if (reworkCommentError) {
                    setReworkCommentError(null);
                  }
                }}
                className="min-h-24 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
                placeholder="Укажите комментарий для доработки"
              />
              {reworkCommentError && <p className="text-xs text-red-600">{reworkCommentError}</p>}
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleReworkCommentSave}>
                  Сохранить комментарий
                </Button>
                <Button variant="ghost" className="flex-1" onClick={handleReworkCommentCancel}>
                  Отмена
                </Button>
              </div>
            </div>
          )}

          <Button className="w-full" onClick={applyFinalDecision}>
            Принять финальное решение
          </Button>
        </Card>
      </div>

      {toastMessage && (
        <div className="fixed right-6 bottom-6 z-50 rounded-md bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">{toastMessage}</div>
      )}
    </div>
  );
};
