import type { ClientContract } from '../../../data/types';

export interface ContractsRepository {
  listContracts(): Promise<ClientContract[]>;
  getContractById(id: string): Promise<ClientContract | null>;
  listContractsByClientId(clientId: string): Promise<ClientContract[]>;
}
