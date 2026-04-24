import { clientContracts as seedContracts, createDefaultContractConfig, getContractConfigById as getSeedContractConfigById } from '../../../data/clientContracts';
import type { ClientContract, ContractWizardConfig } from '../../../data/types';
import type { ContractsRepository } from '../api/contractsRepository';

const cloneContract = (contract: ClientContract): ClientContract => structuredClone(contract);
const cloneContractConfig = (config: ContractWizardConfig): ContractWizardConfig => structuredClone(config);

export const createMockContractsRepository = (): ContractsRepository => {
  const contractsStore = seedContracts.map(cloneContract);
  const contractConfigsStore = new Map<string, ContractWizardConfig>(
    contractsStore.map((contract) => {
      const seedConfig = getSeedContractConfigById(contract.id) ?? createDefaultContractConfig();
      return [contract.id, cloneContractConfig(seedConfig)];
    }),
  );

  return {
  async listContracts() {
    return contractsStore.map(cloneContract);
  },

  async getContractById(id: string) {
    const contract = contractsStore.find((item) => item.id === id);
    return contract ? cloneContract(contract) : null;
  },

  async listContractsByClientId(clientId: string) {
    return contractsStore.filter((contract) => contract.clientId === clientId).map(cloneContract);
  },

  async getPrimaryContractByClientId(clientId: string) {
    const contracts = contractsStore.filter((contract) => contract.clientId === clientId);
    const activeContracts = contracts.filter((contract) => contract.status === 'active');
    const source = activeContracts.length > 0 ? activeContracts : contracts;
    const primaryContract = [...source].sort((left, right) => right.openDate.localeCompare(left.openDate))[0];
    return primaryContract ? cloneContract(primaryContract) : null;
  },

  async getContractConfigById(contractId: string) {
    const config = contractConfigsStore.get(contractId);
    return config ? cloneContractConfig(config) : null;
  },
  };
};
