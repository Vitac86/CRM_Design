import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRelationsByClientId } from '../../data/clientRelations';
import { useClientsStore } from '../../app/ClientsStore';
import { Button, DataTable, EmptyState, FormField } from '../ui';

type SubjectRelationsTabProps = {
  clientId: string;
};

export const SubjectRelationsTab = ({ clientId }: SubjectRelationsTabProps) => {
  const navigate = useNavigate();
  const { clients, getClientById, getAgentClients, addAgentClient } = useClientsStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');

  const relations = getRelationsByClientId(clientId);
  const currentClient = getClientById(clientId);
  const isAgent = currentClient?.roles.includes('Агент') ?? false;
  const agentClients = getAgentClients(clientId);

  const availableClients = useMemo(() => {
    const normalizedQuery = clientQuery.trim().toLowerCase();
    return clients
      .filter((item) => item.id !== clientId)
      .filter((item) => !agentClients.some((linkedClient) => linkedClient.id === item.id))
      .filter((item) => {
        if (!normalizedQuery) {
          return true;
        }

        return `${item.name} ${item.code} ${item.inn}`.toLowerCase().includes(normalizedQuery);
      });
  }, [agentClients, clientId, clientQuery, clients]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setClientQuery('');
    setSelectedClientId('');
  };

  const handleSaveAgentClient = () => {
    if (!selectedClientId) {
      return;
    }

    addAgentClient(clientId, selectedClientId);
    handleCloseModal();
  };

  return (
    <div className="space-y-4">
      {relations.length === 0 ? (
        <EmptyState title="Связи отсутствуют" description="Для клиента не зафиксированы связи." />
      ) : (
        <DataTable
          columns={[
            {
              key: 'relatedName',
              header: 'Связанное лицо / организация',
              className: 'min-w-[260px] font-medium text-slate-800',
              render: (row) =>
                row.relatedClientId ? (
                  <button type="button" className="text-left text-brand hover:underline" onClick={() => navigate(`/subjects/${row.relatedClientId}`)}>
                    {row.relatedName}
                  </button>
                ) : (
                  row.relatedName
                ),
            },
            { key: 'relatedType', header: 'Тип', className: 'min-w-[180px]' },
            { key: 'role', header: 'Роль', className: 'min-w-[170px]' },
            { key: 'dateFrom', header: 'Дата начала', className: 'min-w-[140px]' },
          ]}
          rows={relations}
        />
      )}

      {isAgent ? (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Клиенты агента</h3>
            <Button size="sm" variant="secondary" onClick={() => setIsModalOpen(true)}>
              + Добавить клиента
            </Button>
          </div>

          <DataTable
            columns={[
              {
                key: 'name',
                header: 'Субъект',
                className: 'font-medium text-slate-800',
                render: (row) => (
                  <button type="button" className="text-left text-brand hover:underline" onClick={() => navigate(`/subjects/${row.id}`)}>
                    {row.name}
                  </button>
                ),
              },
              { key: 'code', header: 'Код субъекта', className: 'whitespace-nowrap' },
              { key: 'inn', header: 'ИНН', className: 'whitespace-nowrap' },
              { key: 'type', header: 'Тип' },
            ]}
            rows={agentClients}
            emptyMessage="У агента пока нет привязанных клиентов"
          />
        </div>
      ) : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Добавить клиента агенту</h3>
              <Button variant="secondary" size="sm" onClick={handleCloseModal}>
                Закрыть
              </Button>
            </div>
            <div className="space-y-4">
              <FormField label="Поиск субъекта" value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Введите ФИО, название, код или ИНН" />
              <label className="space-y-1">
                <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Клиент</span>
                <select value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
                  <option value="">Выберите клиента</option>
                  {availableClients.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end">
                <Button size="sm" onClick={handleSaveAgentClient}>
                  Сохранить
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
