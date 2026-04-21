import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ClientHeader } from '../components/crm/ClientHeader';
import { Badge, Button, Card, EmptyState } from '../components/ui';
import { getClientById } from '../data/clients';
import { getTradingProfileByClientId } from '../data/trading';
import type { RiskCategory } from '../data/types';
import { formatClientType } from '../utils/labels';

type TradingRiskCode = 'КНУР' | 'КСУР' | 'КПУР' | 'КОУР';

const riskOptions: TradingRiskCode[] = ['КНУР', 'КСУР', 'КПУР', 'КОУР'];

const riskCategoryToCode: Record<RiskCategory, TradingRiskCode> = {
  Низкий: 'КНУР',
  Средний: 'КСУР',
  Повышенный: 'КПУР',
  Высокий: 'КОУР',
};

const toYesNo = (value: boolean) => (value ? 'Да' : 'Нет');

export const TradingCardPage = () => {
  const { id } = useParams();

  const client = useMemo(() => (id ? getClientById(id) : undefined), [id]);
  const profile = useMemo(() => (id ? getTradingProfileByClientId(id) : undefined), [id]);

  const baseRisk = profile ? riskCategoryToCode[profile.riskCategory] : 'КСУР';

  const [selectedRisk, setSelectedRisk] = useState<TradingRiskCode>(baseRisk);
  const [currentRisk, setCurrentRisk] = useState<TradingRiskCode>(baseRisk);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedRisk(baseRisk);
    setCurrentRisk(baseRisk);
  }, [baseRisk]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setToastMessage(null), 2400);

    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const handleAcceptDecision = () => {
    setCurrentRisk(selectedRisk);
    setToastMessage(`Решение принято. Категория риска изменена на ${selectedRisk}.`);
  };

  if (!id || !client || !profile) {
    return (
      <EmptyState
        title="Карточка трейдинга не найдена"
        description="Проверьте ссылку: профиль трейдинга или клиент отсутствует."
      />
    );
  }

  const podFt = profile.allowCashUsage && profile.allowSecuritiesUsage;

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <ClientHeader name={client.name} clientType={formatClientType(client.type)} clientCode={client.code} riskCategory={currentRisk} />

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="space-y-4 p-4">
          <div className="border-b border-slate-200 pb-3">
            <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">Данные организации</button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="space-y-4 p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">ПОД / ФТ</p>
                <p className="mt-1 text-sm text-slate-900">{toYesNo(podFt)}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Контактные данные</p>
                <p className="text-sm text-slate-900">Телефон: {client.phone}</p>
                <p className="text-sm text-slate-900">Email: {client.email}</p>
                <p className="text-sm text-slate-900">Адрес: {client.address}</p>
              </div>
            </Card>

            <Card className="space-y-3 p-4">
              <p className="text-sm font-semibold text-slate-900">Параметры клиента</p>
              <div className="grid grid-cols-[1fr_auto] items-center gap-2 text-sm">
                <p className="text-slate-600">Тип клиента</p>
                <p className="font-medium text-slate-900">{formatClientType(client.type)}</p>

                <p className="text-slate-600">Категория риска (профиль)</p>
                <p className="font-medium text-slate-900">{profile.riskCategory}</p>

                <p className="text-slate-600">Признак квалифицированного инвестора</p>
                <Badge variant={profile.qualifiedInvestor ? 'success' : 'danger'}>{toYesNo(profile.qualifiedInvestor)}</Badge>

                <p className="text-slate-600">Разрешение на использование денежных средств</p>
                <Badge variant={profile.allowCashUsage ? 'success' : 'danger'}>{toYesNo(profile.allowCashUsage)}</Badge>

                <p className="text-slate-600">Разрешение на использование ценных бумаг</p>
                <Badge variant={profile.allowSecuritiesUsage ? 'success' : 'danger'}>{toYesNo(profile.allowSecuritiesUsage)}</Badge>

                <p className="text-slate-600">Представитель</p>
                <p className="font-medium text-slate-900">{client.representative}</p>
              </div>
            </Card>
          </div>
        </Card>

        <Card className="h-fit space-y-4 p-4">
          <p className="text-sm font-semibold text-slate-900">Категория риска клиента</p>

          <div className="space-y-2">
            {riskOptions.map((option) => (
              <button
                key={option}
                onClick={() => setSelectedRisk(option)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors ${
                  selectedRisk === option
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <Button className="w-full" onClick={handleAcceptDecision}>
            Принять решение
          </Button>
        </Card>
      </div>

      {toastMessage && (
        <div className="fixed right-6 bottom-6 z-50 rounded-md bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">{toastMessage}</div>
      )}
    </div>
  );
};
