import type { Client } from '../../../data/types';

export interface ClientsRepository {
  listClients(): Promise<Client[]>;
  getClientById(id: string): Promise<Client | null>;
  getClientByCode(code: string): Promise<Client | null>;
  createClient(client: Client): Promise<Client>;
  updateClient(id: string, patch: Partial<Client>): Promise<Client | null>;
  archiveClient(id: string): Promise<Client | null>;
  restoreClient(id: string): Promise<Client | null>;
}
