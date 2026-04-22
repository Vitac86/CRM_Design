import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Badge, Button, Card, EmptyState } from '../components/ui';
import { getClientById } from '../data/clients';
import { getTradingProfileByClientId } from '../data/trading';

type TradingTab = 'params' | 'terminals';

const tabClassName = (active: boolean) =>
  `rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
    active ? 'border-brand bg-brand/5 text-brand-dark' : 'border-transparent text-slate-600 hover:text-slate-900'
  }`;

const statusBadgeVariant = (status: 'Активен' | 'Истёк' | 'Подключён' | 'Отключён') => {
  if (status === 'Активен' || status === 'Подключён') {
    return 'success';
  }

  return 'neutral';
};

const terminalIcon = (type: 'QUIK Desktop' | 'QUIK Mobile (Android)' | 'WebQUIK') => {
  if (type === 'QUIK Desktop') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    );
  }

  if (type === 'QUIK Mobile (Android)') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
        <path d="M10.5 5.5h3M11.8 18.5h.4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

export const TradingCardPage = () => {
  const { id } = useParams();

  const client = useMemo(() => (id ? getClientById(id) : undefined), [id]);
  const profile = useMemo(() => (id ? getTradingProfileByClientId(id) : undefined), [id]);

  const [activeTab, setActiveTab] = useState<TradingTab>('params');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setToastMessage(null), 2400);

    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  if (!id || !client || !profile) {
    return (
      <EmptyState
        title="Карточка трейдинга не найдена"
        description="Проверьте ссылку: профиль трейдинга или клиент отсутствует."
      />
    );
  }

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-base font-semibold text-brand-dark">
            {getInitials(client.name)}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{client.name}</h1>
            <p className="text-sm text-slate-500">
              {client.code} · {profile.brokerContractNumber}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-0">
        <div className="border-b border-slate-200 px-4 pt-3">
          <div className="flex flex-wrap gap-2">
            <button className={tabClassName(activeTab === 'params')} onClick={() => setActiveTab('params')}>
              Торговые параметры
            </button>
            <button className={tabClassName(activeTab === 'terminals')} onClick={() => setActiveTab('terminals')}>
              Терминалы и подключения
            </button>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {activeTab === 'params' ? (
            <>
              <Card className="p-4">
                <h2 className="mb-3 text-sm font-semibold text-slate-900">Квалификация и риск</h2>
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Признак инвестора</p>
                    <p className="mt-1 text-sm text-slate-900">
                      {profile.investorStatus === 'Квал' ? 'Квалифицированный' : 'Неквалифицированный'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Уровень риска</p>
                    <p className="mt-1 text-sm text-slate-900">{profile.riskLevel}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Дата присвоения уровня</p>
                    <p className="mt-1 text-sm text-slate-900">{profile.riskAssignedAt}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h2 className="mb-3 text-sm font-semibold text-slate-900">Распорядитель счёта</h2>
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                      {getInitials(profile.accountDisposer.name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{profile.accountDisposer.name}</p>
                      <p className="text-sm text-slate-600">
                        {profile.accountDisposer.role} · {profile.accountDisposer.powerOfAttorney}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm text-slate-600">
                    <p>Полномочия с: {profile.accountDisposer.authorityFrom}</p>
                    <p>Полномочия до: {profile.accountDisposer.authorityUntil}</p>
                    <Badge variant={statusBadgeVariant(profile.accountDisposer.status)}>
                      {profile.accountDisposer.status === 'Активен' ? 'Действует' : 'Истёк'}
                    </Badge>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-900">Кодовое слово</h2>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm tracking-wider text-slate-700">
                  {profile.codeWordMasked}
                </div>
              </Card>

              <Card className="p-4">
                <h2 className="mb-3 text-sm font-semibold text-slate-900">Способы подачи поручений</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {profile.orderMethods.map((method) => (
                    <div key={method.id} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{method.title}</p>
                        <Badge variant={statusBadgeVariant(method.status)}>{method.status}</Badge>
                      </div>
                      <p className="text-sm text-slate-600">{method.description}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900">Терминалы и подключения</h2>
                <Button size="sm" onClick={() => setToastMessage('Выдача терминала добавлена как заглушка')}>
                  + Выдать терминал
                </Button>
              </div>

              <div className="space-y-3">
                {profile.terminals.map((terminal) => (
                  <div
                    key={terminal.id}
                    className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-md bg-slate-100 p-2">{terminalIcon(terminal.type)}</div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{terminal.type}</p>
                        <p className="text-sm text-slate-600">
                          Логин: {terminal.login} · {terminal.uid} · Выдан: {terminal.issuedAt}
                          {terminal.ip ? ` · IP: ${terminal.ip}` : ''}
                          {terminal.certificateUntil ? ` · Сертификат: до ${terminal.certificateUntil}` : ''}
                        </p>
                      </div>
                    </div>
                    <Badge variant={statusBadgeVariant(terminal.status)}>{terminal.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </Card>

      {toastMessage && (
        <div className="fixed right-6 bottom-6 z-50 rounded-md bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">{toastMessage}</div>
      )}
    </div>
  );
};
