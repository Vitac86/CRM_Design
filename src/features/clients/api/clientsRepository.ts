import type { Client } from '../../../data/types';

export interface ClientsRepository {
  listClients(): Promise<Client[]>;
  getClientById(id: string): Promise<Client | null>;
  updateClient(id: string, patch: Partial<Client>): Promise<Client | null>;
  archiveClient(id: string): Promise<Client | null>;
}
