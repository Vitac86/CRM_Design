import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataAccess } from '../app/dataAccess/useDataAccess';
import { PageHeader } from '../components/layout/PageHeader';
import { PageShell } from '../components/layout/PageShell';
import { PageToolbar } from '../components/layout/PageToolbar';
import type { AgentProfile } from '../data/agents';
import type { Client } from '../data/types';
import { Badge, Button, DataTable, FormField, SearchInput } from '../components/ui';

type AgentTableRow = {
  id: string;
  subjectId: string;
  fullName: string;
  company: string;
  contractNumber: string;
  commission: string;
  phone: string;
  email: string;
  status: 'Активен';
};

export const AgentsPage = () => {
  const navigate = useNavigate();
  const { clients: clientsRepository, agents: agentsRepository } = useDataAccess();
  const [clients, setClients] = useState<Client[]>([]);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subjectQuery, setSubjectQuery] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [commission, setCommission] = useState('');

  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      try {
        const [loadedClients, loadedAgents] = await Promise.all([
          clientsRepository.listClients(),
          agentsRepository.listAgents(),
        ]);

        if (isCancelled) {
          return;
        }

        setClients(loadedClients);
        setAgents(loadedAgents);
      } catch {
        if (isCancelled) {
          return;
        }

        setClients([]);
        setAgents([]);
      }
    };

    void loadData();

    return () => {
      isCancelled = true;
    };
  }, [agentsRepository, clientsRepository]);

  const rows = useMemo<AgentTableRow[]>(() => {
    return agents
      .map((agent) => {
        const subject = clients.find((item) => item.id === agent.subjectId);
        if (!subject || !subject.roles.includes('Агент')) {
          return null;
        }

        return {
          id: agent.subjectId,
          subjectId: agent.subjectId,
          fullName: subject.name,
          company: subject.type === 'ФЛ' || subject.type === 'ИП' ? '—' : subject.legalEntityDetails?.shortName || subject.name,
          contractNumber: agent.contractNumber,
          commission: agent.commission,
          phone: subject.phone,
          email: subject.email,
          status: 'Активен',
        };
      })
      .filter((agent): agent is AgentTableRow => Boolean(agent));
  }, [agents, clients]);

  const filteredAgents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return rows;
    }

    return rows.filter((agent) =>
      [agent.fullName, agent.company, agent.contractNumber, agent.commission, agent.phone, agent.email].join(' ').toLowerCase().includes(normalizedSearch),
    );
  }, [rows, search]);

  const selectableSubjects = useMemo(() => {
    const normalizedQuery = subjectQuery.trim().toLowerCase();
    return clients
      .filter((item) => !item.roles.includes('Агент'))
      .filter((item) => {
        if (!normalizedQuery) {
          return true;
        }

        return `${item.name} ${item.code} ${item.inn}`.toLowerCase().includes(normalizedQuery);
      });
  }, [clients, subjectQuery]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSubjectQuery('');
    setSubjectId('');
    setContractNumber('');
    setCommission('');
  };

  const handleSave = async () => {
    if (!subjectId || !contractNumber.trim() || !commission.trim()) {
      return;
    }

    const nextAgent = await agentsRepository.createOrUpdateAgent({
      subjectId,
      contractNumber: contractNumber.trim(),
      commission: commission.trim(),
    });

    setAgents((prev) => {
      const existingAgentIndex = prev.findIndex((item) => item.subjectId === nextAgent.subjectId);
      if (existingAgentIndex < 0) {
        return [...prev, nextAgent];
      }

      const nextAgents = [...prev];
      nextAgents[existingAgentIndex] = nextAgent;
      return nextAgents;
    });

    setClients((prev) =>
      prev.map((client) => {
        if (client.id !== subjectId || client.roles.includes('Агент')) {
          return client;
        }

        return {
          ...client,
          roles: [...client.roles, 'Агент'],
        };
      }),
    );

    handleCloseModal();
  };

  return (
    <PageShell>
      <PageHeader title="Агенты" actions={<Button onClick={() => setIsModalOpen(true)}>+ Добавить агента</Button>} />

      <PageToolbar
        search={
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по субъекту, договору, комиссии, телефону или email"
          />
        }
      />

      <DataTable<AgentTableRow>
        columns={[
          {
            key: 'fullName',
            header: 'Субъект',
            className: 'font-medium text-slate-800',
            render: (row) => (
              <button type="button" className="crm-link text-left hover:underline focus-visible:underline" onClick={() => navigate(`/subjects/${row.subjectId}`)}>
                {row.fullName}
              </button>
            ),
          },
          { key: 'company', header: 'Компания' },
          { key: 'contractNumber', header: 'Номер договора', className: 'whitespace-nowrap' },
          { key: 'commission', header: 'Комиссия', className: 'whitespace-nowrap' },
          { key: 'phone', header: 'Телефон', className: 'whitespace-nowrap' },
          { key: 'email', header: 'Email', className: 'whitespace-nowrap' },
          {
            key: 'status',
            header: 'Статус',
            render: () => <Badge variant="success">Активен</Badge>,
          },
        ]}
        rows={filteredAgents}
        emptyMessage="Агенты по заданным критериям не найдены"
      />

      {isModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label="Добавить агента">
          <div className="w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">Добавить агента</h3>
              <Button variant="secondary" size="sm" onClick={handleCloseModal}>
                Закрыть
              </Button>
            </div>

            <div className="space-y-4">
              <FormField label="Поиск субъекта" value={subjectQuery} onChange={(event) => setSubjectQuery(event.target.value)} placeholder="Введите ФИО, название, код или ИНН" />

              <label className="space-y-1">
                <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Субъект</span>
                <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
                  <option value="">Выберите субъекта</option>
                  {selectableSubjects.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Номер договора" value={contractNumber} onChange={(event) => setContractNumber(event.target.value)} placeholder="Например, AG-2026/001" />
                <FormField label="Комиссионное вознаграждение" value={commission} onChange={(event) => setCommission(event.target.value)} placeholder="Например, 1.5%" />
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button size="sm" onClick={() => void handleSave()}>
                  Сохранить
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
};
