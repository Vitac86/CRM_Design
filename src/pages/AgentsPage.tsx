import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, DataTable, SearchInput } from '../components/ui';
import { agents, type Agent, type AgentStatus } from '../data/agents';

const badgeByStatus: Record<AgentStatus, 'success' | 'warning' | 'neutral'> = {
  'Активен': 'success',
  'На проверке': 'warning',
  'Неактивен': 'neutral',
};

export const AgentsPage = () => {
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredAgents = useMemo(
    () =>
      agents.filter((agent) => {
        const normalizedSearch = search.trim().toLowerCase();

        if (!normalizedSearch) {
          return true;
        }

        return [agent.fullName, agent.company, agent.agentCode, agent.phone, agent.email].join(' ').toLowerCase().includes(normalizedSearch);
      }),
    [search],
  );

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Агенты</h1>
        <Button onClick={() => setToastMessage('Функция добавления агента будет доступна в следующей версии.')}>+ Добавить агента</Button>
      </header>

      <SearchInput
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Поиск по ФИО, компании, коду, телефону или email"
        className="max-w-xl"
      />

      <DataTable<Agent>
        columns={[
          { key: 'fullName', header: 'ФИО', className: 'font-medium text-slate-800' },
          { key: 'company', header: 'Компания' },
          { key: 'agentCode', header: 'Код агента', className: 'whitespace-nowrap' },
          { key: 'phone', header: 'Телефон', className: 'whitespace-nowrap' },
          { key: 'email', header: 'Email', className: 'whitespace-nowrap' },
          {
            key: 'status',
            header: 'Статус',
            render: (agent) => <Badge variant={badgeByStatus[agent.status]}>{agent.status}</Badge>,
          },
        ]}
        rows={filteredAgents}
        emptyMessage="Агенты по заданным критериям не найдены"
      />

      {toastMessage ? (
        <div className="fixed right-6 bottom-6 z-50 rounded-md bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">{toastMessage}</div>
      ) : null}
    </div>
  );
};
