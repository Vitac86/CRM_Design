import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ClientHeader } from '../components/crm/ClientHeader';
import { Badge, Button, Card } from '../components/ui';

type TradingRiskCode = 'КНУР' | 'КСУР' | 'КПУР' | 'КОУР';

type TradingCardMock = {
  id: string;
  clientName: string;
  clientType: string;
  clientCode: string;
  riskCategory: TradingRiskCode;
  podFt: string;
  blockStatus: string;
  blockReason: string;
  phone: string;
  email: string;
  address: string;
  qualifiedInvestor: boolean;
  allowCashUsage: boolean;
  allowSecuritiesUsage: boolean;
  representative: string;
  powerOfAttorneyTerm: string;
  codeWord: string;
};

const riskOptions: TradingRiskCode[] = ['КНУР', 'КСУР', 'КПУР', 'КОУР'];

const mockTradingCard: TradingCardMock = {
  id: 'c-1',
  clientName: 'ООО «Север Инвест»',
  clientType: 'ЮЛ',
  clientCode: 'CL-000001',
  riskCategory: 'КСУР',
  podFt: 'Да',
  blockStatus: 'Заморожен',
  blockReason: 'Ограничение по внутреннему предписанию комплаенса',
  phone: '+7 (495) 123-45-67',
  email: 'office@sever-invest.ru',
  address: 'г. Москва, Пресненская наб., 10, стр. 2',
  qualifiedInvestor: true,
  allowCashUsage: false,
  allowSecuritiesUsage: true,
  representative: 'Иванов Иван Иванович',
  powerOfAttorneyTerm: 'до 31.12.2027',
  codeWord: 'Гранит',
};

const toYesNo = (value: boolean) => (value ? 'Да' : 'Нет');

export const TradingCardPage = () => {
  const { id } = useParams();

  const clientData = useMemo<TradingCardMock>(
    () => ({
      ...mockTradingCard,
      id: id ?? mockTradingCard.id,
      clientCode: `CL-${(id ?? '1').replace('c-', '').padStart(6, '0')}`,
    }),
    [id],
  );

  const [selectedRisk, setSelectedRisk] = useState<TradingRiskCode>(clientData.riskCategory);
  const [currentRisk, setCurrentRisk] = useState<TradingRiskCode>(clientData.riskCategory);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedRisk(clientData.riskCategory);
    setCurrentRisk(clientData.riskCategory);
  }, [clientData.riskCategory]);

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

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <ClientHeader
        name={clientData.clientName}
        clientType={clientData.clientType}
        clientCode={clientData.clientCode}
        riskCategory={currentRisk}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="space-y-4 p-4">
          <div className="border-b border-slate-200 pb-3">
            <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">Данные организации</button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="space-y-4 p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">ПОД / ФТ</p>
                <p className="mt-1 text-sm text-slate-900">{clientData.podFt}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Статус</p>
                <Badge variant="danger" className="mt-1">
                  {clientData.blockStatus}
                </Badge>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Причина блокировки / заморозки</p>
                <p className="mt-1 text-sm text-slate-900">{clientData.blockReason}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Контактные данные</p>
                <p className="text-sm text-slate-900">Телефон: {clientData.phone}</p>
                <p className="text-sm text-slate-900">Email: {clientData.email}</p>
                <p className="text-sm text-slate-900">Адрес: {clientData.address}</p>
              </div>
            </Card>

            <Card className="space-y-3 p-4">
              <p className="text-sm font-semibold text-slate-900">Параметры клиента</p>
              <div className="grid grid-cols-[1fr_auto] items-center gap-2 text-sm">
                <p className="text-slate-600">Признак квалифицированного инвестора</p>
                <Badge variant={clientData.qualifiedInvestor ? 'success' : 'danger'}>{toYesNo(clientData.qualifiedInvestor)}</Badge>

                <p className="text-slate-600">Разрешение на использование денежных средств</p>
                <Badge variant={clientData.allowCashUsage ? 'success' : 'danger'}>{toYesNo(clientData.allowCashUsage)}</Badge>

                <p className="text-slate-600">Разрешение на использование ценных бумаг</p>
                <Badge variant={clientData.allowSecuritiesUsage ? 'success' : 'danger'}>{toYesNo(clientData.allowSecuritiesUsage)}</Badge>

                <p className="text-slate-600">Представитель</p>
                <p className="font-medium text-slate-900">{clientData.representative}</p>

                <p className="text-slate-600">Срок полномочий</p>
                <p className="font-medium text-slate-900">{clientData.powerOfAttorneyTerm}</p>

                <p className="text-slate-600">Кодовое слово</p>
                <p className="font-medium text-slate-900">{clientData.codeWord}</p>
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
