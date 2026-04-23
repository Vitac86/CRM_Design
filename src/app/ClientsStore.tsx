import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { clients as initialClients } from '../data/clients';
import type { Client } from '../data/types';

type ClientsStoreValue = {
  clients: Client[];
  getClientById: (id: string) => Client | undefined;
  getClientByCode: (code: string) => Client | undefined;
  addClient: (client: Client) => void;
  updateClient: (id: string, patch: Partial<Client>) => void;
  archiveClient: (id: string) => void;
  restoreClient: (id: string) => void;
};

const ClientsStoreContext = createContext<ClientsStoreValue | undefined>(undefined);

const cloneClient = (client: Client): Client => ({
  ...client,
  roles: [...client.roles],
  manager: { ...client.manager },
  agent: { ...client.agent },
  reportDelivery: {
    email: { ...client.reportDelivery.email },
    personalAccount: { ...client.reportDelivery.personalAccount },
  },
  registrationAddress: { ...client.registrationAddress },
  bankDetails: { ...client.bankDetails },
  bankAccounts: client.bankAccounts ? client.bankAccounts.map((account) => ({ ...account })) : undefined,
  individualDetails: client.individualDetails ? { ...client.individualDetails } : undefined,
  legalEntityDetails: client.legalEntityDetails ? { ...client.legalEntityDetails } : undefined,
});

export const ClientsProvider = ({ children }: { children: ReactNode }) => {
  const [clients, setClients] = useState<Client[]>(() => initialClients.map(cloneClient));

  const value = useMemo<ClientsStoreValue>(
    () => ({
      clients,
      getClientById: (id: string) => clients.find((client) => client.id === id),
      getClientByCode: (code: string) => clients.find((client) => client.code === code),
      addClient: (client: Client) => {
        setClients((prev) => [...prev, cloneClient(client)]);
      },
      updateClient: (id: string, patch: Partial<Client>) => {
        setClients((prev) =>
          prev.map((client) => {
            if (client.id !== id) {
              return client;
            }

            return {
              ...client,
              ...patch,
            };
          }),
        );
      },
      archiveClient: (id: string) => {
        const archivedAt = new Date().toISOString().slice(0, 10);
        setClients((prev) =>
          prev.map((client) => {
            if (client.id !== id) {
              return client;
            }

            return {
              ...client,
              isArchived: true,
              archivedAt,
            };
          }),
        );
      },
      restoreClient: (id: string) => {
        setClients((prev) =>
          prev.map((client) => {
            if (client.id !== id) {
              return client;
            }

            return {
              ...client,
              isArchived: false,
              archivedAt: undefined,
            };
          }),
        );
      },
    }),
    [clients],
  );

  return <ClientsStoreContext.Provider value={value}>{children}</ClientsStoreContext.Provider>;
};

export const useClientsStore = () => {
  const context = useContext(ClientsStoreContext);

  if (!context) {
    throw new Error('useClientsStore must be used within ClientsProvider');
  }

  return context;
};
