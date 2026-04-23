import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { clients as initialClients } from '../data/clients';
import { agentClientLinks as initialAgentClientLinks, agents as initialAgents, type AgentClientLink, type AgentProfile } from '../data/agents';
import type { Client } from '../data/types';

type AddAgentPayload = {
  subjectId: string;
  contractNumber: string;
  commission: string;
};

type ClientsStoreValue = {
  clients: Client[];
  agents: AgentProfile[];
  agentClientLinks: AgentClientLink[];
  getClientById: (id: string) => Client | undefined;
  getClientByCode: (code: string) => Client | undefined;
  getAgentBySubjectId: (subjectId: string) => AgentProfile | undefined;
  getAgentClients: (agentSubjectId: string) => Client[];
  addClient: (client: Client) => void;
  updateClient: (id: string, patch: Partial<Client>) => void;
  archiveClient: (id: string) => void;
  restoreClient: (id: string) => void;
  addAgent: (payload: AddAgentPayload) => void;
  addAgentClient: (agentSubjectId: string, clientSubjectId: string) => void;
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
  addresses: {
    registration: { ...client.addresses.registration },
    location: { ...client.addresses.location },
    mailing: { ...client.addresses.mailing },
    locationMatchesRegistration: client.addresses.locationMatchesRegistration,
    mailingMatchesRegistration: client.addresses.mailingMatchesRegistration,
  },
  representatives: client.representatives.map((representative) => ({ ...representative })),
  bankDetails: { ...client.bankDetails },
  bankAccounts: client.bankAccounts ? client.bankAccounts.map((account) => ({ ...account })) : undefined,
  individualDetails: client.individualDetails ? { ...client.individualDetails } : undefined,
  legalEntityDetails: client.legalEntityDetails
    ? {
        ...client.legalEntityDetails,
      }
    : undefined,
});

export const ClientsProvider = ({ children }: { children: ReactNode }) => {
  const [clients, setClients] = useState<Client[]>(() =>
    initialClients.map(cloneClient).map((client) => {
      const isInitialAgent = initialAgents.some((agent) => agent.subjectId === client.id);
      if (!isInitialAgent || client.roles.includes('Агент')) {
        return client;
      }

      return {
        ...client,
        roles: [...client.roles, 'Агент'],
      };
    }),
  );
  const [agents, setAgents] = useState<AgentProfile[]>(() => initialAgents.map((agent) => ({ ...agent })));
  const [agentClientLinks, setAgentClientLinks] = useState<AgentClientLink[]>(() => initialAgentClientLinks.map((link) => ({ ...link })));

  const value = useMemo<ClientsStoreValue>(
    () => ({
      clients,
      agents,
      agentClientLinks,
      getClientById: (id: string) => clients.find((client) => client.id === id),
      getClientByCode: (code: string) => clients.find((client) => client.code === code),
      getAgentBySubjectId: (subjectId: string) => agents.find((agent) => agent.subjectId === subjectId),
      getAgentClients: (agentSubjectId: string) => {
        const clientIds = agentClientLinks.filter((link) => link.agentSubjectId === agentSubjectId).map((link) => link.clientSubjectId);
        return clients.filter((client) => clientIds.includes(client.id));
      },
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
      addAgent: ({ subjectId, contractNumber, commission }: AddAgentPayload) => {
        setAgents((prev) => {
          if (prev.some((agent) => agent.subjectId === subjectId)) {
            return prev.map((agent) =>
              agent.subjectId === subjectId
                ? {
                    ...agent,
                    contractNumber,
                    commission,
                  }
                : agent,
            );
          }
          return [...prev, { subjectId, contractNumber, commission }];
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
      },
      addAgentClient: (agentSubjectId: string, clientSubjectId: string) => {
        setAgentClientLinks((prev) => {
          const alreadyExists = prev.some((item) => item.agentSubjectId === agentSubjectId && item.clientSubjectId === clientSubjectId);
          if (alreadyExists) {
            return prev;
          }

          return [
            ...prev,
            {
              id: `agent-client-${Date.now()}`,
              agentSubjectId,
              clientSubjectId,
              createdAt: new Date().toISOString().slice(0, 10),
            },
          ];
        });
      },
    }),
    [agentClientLinks, agents, clients],
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
