import { clientContracts as seedContracts } from '../../../data/clientContracts';
import type { ClientContract } from '../../../data/types';
import type { ContractsRepository } from '../api/contractsRepository';

const cloneContract = (contract: ClientContract): ClientContract => ({ ...contract });

const contractsStore = seedContracts.map(cloneContract);

export const createMockContractsRepository = (): ContractsRepository => ({
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
});
