import { clients as seedClients } from '../../../data/clients';
import type { Client } from '../../../data/types';
import type { ClientsRepository } from '../api/clientsRepository';

const cloneClient = (client: Client): Client => structuredClone(client);

const clientsStore = seedClients.map(cloneClient);

export const createMockClientsRepository = (): ClientsRepository => ({
  async listClients() {
    return clientsStore.map(cloneClient);
  },

  async getClientById(id: string) {
    const client = clientsStore.find((item) => item.id === id);
    return client ? cloneClient(client) : null;
  },
});
