import type { ClientContract, ContractProductType, ContractWizardConfig } from '../../../data/types';

export interface ContractsRepository {
  listContracts(): Promise<ClientContract[]>;
  getContractById(id: string): Promise<ClientContract | null>;
  listContractsByClientId(clientId: string): Promise<ClientContract[]>;
  getPrimaryContractByClientId(clientId: string): Promise<ClientContract | null>;
  getContractConfigById(contractId: string): Promise<ContractWizardConfig | null>;
  createDefaultContractConfig(params?: { clientEmail?: string; clientType?: string }): Promise<ContractWizardConfig>;
  createContract(payload: {
    clientId: string;
    type?: ContractProductType;
    number?: string;
    openDate?: string;
    closeDate?: string | null;
    status?: ClientContract['status'];
    config?: ContractWizardConfig;
  }): Promise<ClientContract>;
  updateContract(contractId: string, patch: Partial<Omit<ClientContract, 'id' | 'clientId'>>): Promise<ClientContract | null>;
  updateContractConfig(contractId: string, config: ContractWizardConfig): Promise<ContractWizardConfig | null>;
}
