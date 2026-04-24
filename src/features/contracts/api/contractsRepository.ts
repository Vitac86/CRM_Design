import type { ClientContract, ContractWizardConfig } from '../../../data/types';

export interface ContractsRepository {
  listContracts(): Promise<ClientContract[]>;
  getContractById(id: string): Promise<ClientContract | null>;
  listContractsByClientId(clientId: string): Promise<ClientContract[]>;
  getPrimaryContractByClientId(clientId: string): Promise<ClientContract | null>;
  getContractConfigById(contractId: string): Promise<ContractWizardConfig | null>;
}
