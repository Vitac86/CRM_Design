import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataAccess } from '../app/dataAccess/useDataAccess';
import { Button, DataTable, EmptyState, FilterChipSelect, SearchInput, TableControlPanel, TableStatusText } from '../components/ui';
import type { Client, ClientType } from '../data/types';
import { formatClientType, formatComplianceStatus, formatResidency } from '../utils/labels';
import { subjectStatusTone } from '../utils/tableStatus';

export const ArchivesPage = () => {
  const navigate = useNavigate();
  const { clients: clientsRepository } = useDataAccess();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ClientType | 'all'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const archivedClients = useMemo(() => clients.filter((client) => client.isArchived === true), [clients]);
  const typeOptions = useMemo(() => [...new Set(archivedClients.map((client) => client.type))], [archivedClients]);
  const filteredClients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return archivedClients.filter((client) => {
      if (
        normalizedSearch &&
        ![client.name, client.code, client.inn, client.email].some((value) => value.toLowerCase().includes(normalizedSearch))
      ) {
        return false;
      }

      if (typeFilter !== 'all' && client.type !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [archivedClients, search, typeFilter]);

  useEffect(() => {
    let isMounted = true;

    const loadClients = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await clientsRepository.listClients();
        if (!isMounted) {
          return;
        }
        setClients(data);
      } catch {
        if (!isMounted) {
          return;
        }
        setError('Не удалось загрузить архив субъектов.');
      } finally {
        if (!isMounted) {
          return;
        }
        setIsLoading(false);
      }
    };

    void loadClients();

    return () => {
      isMounted = false;
    };
  }, [clientsRepository]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setToastMessage(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const handleRestoreClient = async (id: string) => {
    const restoredClient = await clientsRepository.restoreClient(id);

    if (!restoredClient) {
      return;
    }

    setClients((prevClients) =>
      prevClients.map((client) => (client.id === restoredClient.id ? restoredClient : client)),
    );
    setToastMessage('Субъект восстановлен из архива');
  };

  return (
    <div className="min-w-0 space-y-4 rounded-2xl bg-slate-100/80 p-4 sm:p-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Архив</h1>
        <p className="text-sm text-slate-500">Субъекты, выведенные из активного списка</p>
      </header>

      <TableControlPanel
        search={
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по клиенту, коду, ИНН или email"
            className="w-full"
          />
        }
        filters={
          <FilterChipSelect
            label="Тип"
            value={typeFilter}
            displayValue={typeFilter === 'all' ? 'Все' : formatClientType(typeFilter)}
            onChange={(value) => setTypeFilter(value as ClientType | 'all')}
            active={typeFilter !== 'all'}
            options={[
              { value: 'all', label: 'Все' },
              ...typeOptions.map((type) => ({ value: type, label: formatClientType(type) })),
            ]}
          />
        }
      />

      {isLoading ? <p className="text-sm text-slate-500">Загрузка архива…</p> : null}
      {!isLoading && error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!isLoading && !error && archivedClients.length === 0 ? (
        <EmptyState
          title="Архив пуст"
          description="В архиве пока нет субъектов"
          action={
            <Button variant="secondary" size="sm" onClick={() => navigate('/subjects')}>
              Вернуться к субъектам
            </Button>
          }
        />
      ) : null}

      {!isLoading && !error && archivedClients.length > 0 ? (
        <DataTable<Client>
          columns={[
            { key: 'code', header: 'Код клиента', className: 'font-medium text-slate-800 whitespace-nowrap' },
            { key: 'name', header: 'Наименование клиента', className: 'min-w-[260px]' },
            { key: 'inn', header: 'ИНН' },
            {
              key: 'type',
              header: 'Тип',
              render: (client) => (
                <TableStatusText tone={subjectStatusTone.clientType[client.type]}>{formatClientType(client.type)}</TableStatusText>
              ),
            },
            {
              key: 'residency',
              header: 'Резидент',
              render: (client) => (
                <TableStatusText tone={subjectStatusTone.residency[client.residency]}>
                  {formatResidency(client.residency)}
                </TableStatusText>
              ),
            },
            {
              key: 'complianceStatus',
              header: 'Статус комплаенса',
              render: (client) => (
                <TableStatusText tone={subjectStatusTone.compliance[client.complianceStatus]}>
                  {formatComplianceStatus(client.complianceStatus)}
                </TableStatusText>
              ),
            },
            { key: 'archivedAt', header: 'Дата архивации', render: (client) => client.archivedAt ?? '—' },
            {
              key: 'actions',
              header: 'Действия',
              className: 'w-[150px]',
              render: (client) => (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRestoreClient(client.id);
                  }}
                >
                  Восстановить
                </Button>
              ),
            },
          ]}
          rows={filteredClients}
          emptyMessage="Нет архивных субъектов по выбранным условиям"
        />
      ) : null}

      {toastMessage ? (
        <div className="fixed right-6 bottom-6 z-50 rounded-md bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">{toastMessage}</div>
      ) : null}
    </div>
  );
};
