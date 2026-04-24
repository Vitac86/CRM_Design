import { clients as seedClients } from '../../../data/clients';
import type { Client } from '../../../data/types';
import type { ClientsRepository } from '../api/clientsRepository';

const cloneClient = (client: Client): Client => structuredClone(client);

export const createMockClientsRepository = (): ClientsRepository => {
  const clientsStore = seedClients.map(cloneClient);

  return {
    async listClients() {
      return clientsStore.map(cloneClient);
    },

    async getClientById(id: string) {
      const client = clientsStore.find((item) => item.id === id);
      return client ? cloneClient(client) : null;
    },

    async getClientByCode(code: string) {
      const client = clientsStore.find((item) => item.code === code);
      return client ? cloneClient(client) : null;
    },

    async createClient(client: Client) {
      const nextClient = cloneClient(client);
      const existingClientIndex = clientsStore.findIndex((item) => item.id === nextClient.id);

      if (existingClientIndex >= 0) {
        clientsStore[existingClientIndex] = nextClient;
        return cloneClient(nextClient);
      }

      clientsStore.push(nextClient);
      return cloneClient(nextClient);
    },

    async updateClient(id: string, patch: Partial<Client>) {
      const clientIndex = clientsStore.findIndex((item) => item.id === id);
      if (clientIndex < 0) {
        return null;
      }

      clientsStore[clientIndex] = {
        ...clientsStore[clientIndex],
        ...patch,
      };

      return cloneClient(clientsStore[clientIndex]);
    },

    async archiveClient(id: string) {
      const clientIndex = clientsStore.findIndex((item) => item.id === id);
      if (clientIndex < 0) {
        return null;
      }

      clientsStore[clientIndex] = {
        ...clientsStore[clientIndex],
        isArchived: true,
        archivedAt: new Date().toISOString().slice(0, 10),
      };

      return cloneClient(clientsStore[clientIndex]);
    },

    async restoreClient(id: string) {
      const clientIndex = clientsStore.findIndex((item) => item.id === id);
      if (clientIndex < 0) {
        return null;
      }

      clientsStore[clientIndex] = {
        ...clientsStore[clientIndex],
        isArchived: false,
        archivedAt: undefined,
      };

      return cloneClient(clientsStore[clientIndex]);
    },
  };
};
