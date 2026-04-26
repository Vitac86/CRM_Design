import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Badge, Button, Card, EmptyState } from '../components/ui';
import { useDataAccess } from '../app/dataAccess/useDataAccess';
import type { Client, TradingProfile } from '../data/types';

type TradingTab = 'params' | 'terminals';

const tabClassName = (active: boolean) =>
  `crm-tab relative px-5 py-3 text-sm font-medium transition-colors ${active ? 'crm-tab-active font-semibold' : ''}`;

const statusBadgeVariant = (status: 'Активен' | 'Истёк' | 'Подключён' | 'Отключён') => {
  if (status === 'Активен' || status === 'Подключён') {
    return 'success';
  }

  return 'neutral';
};

const amlBadgeVariant = (amlStatus: string) => {
  if (amlStatus === 'АКТИВЕН') {
    return 'success';
  }

  if (amlStatus === 'НА ПРОВЕРКЕ' || amlStatus === 'ЗАМОРОЖЕН') {
    return 'warning';
  }

  return 'info';
};

const terminalIcon = (type: 'QUIK Desktop' | 'QUIK Mobile (Android)' | 'WebQUIK') => {
  if (type === 'QUIK Desktop') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    );
  }

  if (type === 'QUIK Mobile (Android)') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
        <path d="M10.5 5.5h3M11.8 18.5h.4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" strokeWidth="1.8">
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
  const { clients: clientsRepository, trading: tradingRepository } = useDataAccess();
  const { id } = useParams();

  const [client, setClient] = useState<Client | null>(null);
  const [profile, setProfile] = useState<TradingProfile | null>(null);

  useEffect(() => {
    if (!id) {
      setClient(null);
      setProfile(null);
      return;
    }

    let isMounted = true;

    void Promise.all([clientsRepository.getClientById(id), tradingRepository.getTradingItemById(id)]).then(
      ([loadedClient, loadedProfile]) => {
        if (!isMounted) {
          return;
        }

        setClient(loadedClient ?? null);
        setProfile(loadedProfile);
      },
    );

    return () => {
      isMounted = false;
    };
  }, [clientsRepository, id, tradingRepository]);

  const [activeTab, setActiveTab] = useState<TradingTab>('params');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [passwordResetTerminalId, setPasswordResetTerminalId] = useState<string | null>(null);

  const isQuikMobileTerminal = (terminalType: string) => terminalType.toLowerCase().includes('quik mobile');
  const selectedTerminal = useMemo(
    () => profile?.terminals.find((terminal) => terminal.id === passwordResetTerminalId),
    [passwordResetTerminalId, profile],
  );

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
    <div className="min-w-0 space-y-4 rounded-2xl bg-[var(--color-muted-surface)] p-4 sm:p-5">
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-base font-semibold text-brand-dark">
            {getInitials(client.name)}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{client.name}</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {client.code} · {profile.brokerContractNumber}
            </p>
          </div>
        </div>
      </Card>

      <Card className="crm-tabs overflow-hidden rounded-xl border p-0 shadow-sm">
        <div className="overflow-x-auto">
          <div className="flex min-w-max border-b px-1">
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
                <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Квалификация и риск</h2>
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Признак инвестора</p>
                    <p className="mt-1 text-sm text-[var(--color-text-primary)]">
                      {profile.investorStatus === 'Квал' ? 'Квалифицированный' : 'Неквалифицированный'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Уровень риска</p>
                    <p className="mt-1 text-sm text-[var(--color-text-primary)]">{profile.riskLevel}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Дата присвоения уровня</p>
                    <p className="mt-1 text-sm text-[var(--color-text-primary)]">{profile.riskAssignedAt}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">ПОД / ФТ</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Статус</p>
                    <div className="mt-1">
                      <Badge variant={amlBadgeVariant(profile.amlStatus)}>{profile.amlStatus}</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Причина блокировки / заморозки</p>
                    <p className="mt-1 text-sm text-[var(--color-text-primary)]">{profile.amlFreezeReason || '—'}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Контактные данные</h2>
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Номера телефонов</p>
                    <p className="mt-1 text-sm text-[var(--color-text-primary)]">{client.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">E-mail</p>
                    <p className="mt-1 text-sm text-[var(--color-text-primary)]">{client.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">Адрес</p>
                    <p className="mt-1 text-sm text-[var(--color-text-primary)]">{client.address || '—'}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Распорядитель счёта</h2>
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted-surface)] text-xs font-semibold text-[var(--color-text-secondary)]">
                      {getInitials(profile.accountDisposer.name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{profile.accountDisposer.name}</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        {profile.accountDisposer.role} · {profile.accountDisposer.powerOfAttorney}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm text-[var(--color-text-secondary)]">
                    <p>Полномочия с: {profile.accountDisposer.authorityFrom}</p>
                    <p>Полномочия до: {profile.accountDisposer.authorityUntil}</p>
                    <Badge variant={statusBadgeVariant(profile.accountDisposer.status)}>
                      {profile.accountDisposer.status === 'Активен' ? 'Действует' : 'Истёк'}
                    </Badge>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h2 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">Кодовое слово</h2>
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted-surface)] px-3 py-2 text-sm tracking-wider text-[var(--color-text-secondary)]">
                  {profile.codeWord}
                </div>
              </Card>

              <Card className="p-4">
                <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Способы подачи поручений</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {profile.orderMethods.map((method) => (
                    <div key={method.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{method.title}</p>
                        <Badge variant={statusBadgeVariant(method.status)}>{method.status}</Badge>
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)]">{method.description}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Терминалы и подключения</h2>
                <Button size="sm" onClick={() => setToastMessage('Выдача терминала добавлена как заглушка')}>
                  + Выдать терминал
                </Button>
              </div>

              <div className="space-y-3">
                {profile.terminals.map((terminal) => (
                  <div
                    key={terminal.id}
                    className="grid gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-md bg-[var(--color-muted-surface)] p-2">{terminalIcon(terminal.type)}</div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{terminal.type}</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">
                          Логин: {terminal.login} · {terminal.uid} · Выдан: {terminal.issuedAt}
                          {terminal.ip ? ` · IP: ${terminal.ip}` : ''}
                          {terminal.certificateUntil ? ` · Сертификат: до ${terminal.certificateUntil}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <Badge variant={statusBadgeVariant(terminal.status)}>{terminal.status}</Badge>
                      {isQuikMobileTerminal(terminal.type) && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setPasswordResetTerminalId(terminal.id)}
                          aria-label="Обновить пароль для QUIK Mobile"
                        >
                          Обновить пароль
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </Card>

      {toastMessage && (
        <div className="fixed right-6 bottom-6 z-50 rounded-md bg-[var(--color-text-primary)] px-4 py-3 text-sm text-[var(--color-surface)] shadow-lg">{toastMessage}</div>
      )}

      {selectedTerminal && isQuikMobileTerminal(selectedTerminal.type) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[color:color-mix(in_srgb,var(--color-text-primary)_28%,transparent)] p-4" role="dialog" aria-modal="true" aria-labelledby="reset-password-modal-title" aria-describedby="reset-password-modal-description">
          <div
            className="w-full max-w-sm max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 shadow-xl"
          >
            <h3 id="reset-password-modal-title" className="text-base font-semibold text-[var(--color-text-primary)]">
              Обновить пароль?
            </h3>
            <p id="reset-password-modal-description" className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Вы уверены, что хотите обновить пароль для QUIK Mobile?
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPasswordResetTerminalId(null)}
                aria-label="Отмена обновления пароля для QUIK Mobile"
              >
                Отмена
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setToastMessage('Пароль обновлён');
                  setPasswordResetTerminalId(null);
                }}
                aria-label="Подтвердить обновление пароля для QUIK Mobile"
              >
                Обновить
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
