import type { Client } from '../../../data/types';

export interface ClientsRepository {
  listClients(): Promise<Client[]>;
  getClientById(id: string): Promise<Client | null>;
}
