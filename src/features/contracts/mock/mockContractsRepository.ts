import { clientContracts as seedContracts, createDefaultContractConfig as createSeedDefaultContractConfig } from '../../../data/clientContracts';
import type { ClientContract, ContractProductType, ContractWizardConfig } from '../../../data/types';
import type { ContractsRepository } from '../api/contractsRepository';

const cloneContract = (contract: ClientContract): ClientContract => structuredClone(contract);
const cloneContractConfig = (config: ContractWizardConfig): ContractWizardConfig => structuredClone(config);

const contractTypePrefixMap: Record<ContractProductType, string> = {
  broker: 'BR',
  depository: 'DP',
  trust: 'DU',
  iis: 'IIS',
  other: 'IN',
};

export const createMockContractsRepository = (): ContractsRepository => {
  const contractsStore = seedContracts.map(cloneContract);
  const contractConfigsStore = new Map<string, ContractWizardConfig>(
    contractsStore.map((contract) => {
      return [contract.id, createSeedDefaultContractConfig()];
    }),
  );
  let nextContractId = contractsStore.reduce((maxValue, contract) => {
    const numericPart = Number(contract.id.replace('ctr-', ''));
    return Number.isFinite(numericPart) ? Math.max(maxValue, numericPart) : maxValue;
  }, 0) + 1;

  const generateContractNumber = (type: ContractProductType = 'broker') => {
    const year = new Date().getFullYear();
    const nextIndex = contractsStore.length + 1;
    const serial = String(nextIndex).padStart(5, '0');
    return `${contractTypePrefixMap[type]}-${year}/${serial}`;
  };

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

    async createDefaultContractConfig(params?: { clientEmail?: string; clientType?: string }) {
      return createSeedDefaultContractConfig(params);
    },

    async createContract(payload) {
      const type = payload.type ?? 'broker';
      const contract: ClientContract = {
        id: `ctr-${nextContractId}`,
        clientId: payload.clientId,
        number: payload.number?.trim() || generateContractNumber(type),
        type,
        openDate: payload.openDate ?? new Date().toISOString().slice(0, 10),
        closeDate: payload.closeDate ?? null,
        status: payload.status ?? 'active',
      };
      nextContractId += 1;

      contractsStore.unshift(contract);
      contractConfigsStore.set(contract.id, cloneContractConfig(payload.config ?? createSeedDefaultContractConfig()));
      return cloneContract(contract);
    },

    async updateContract(contractId, patch) {
      const contractIndex = contractsStore.findIndex((contract) => contract.id === contractId);
      if (contractIndex < 0) {
        return null;
      }

      contractsStore[contractIndex] = {
        ...contractsStore[contractIndex],
        ...patch,
      };

      return cloneContract(contractsStore[contractIndex]);
    },

    async updateContractConfig(contractId, config) {
      const contract = contractsStore.find((item) => item.id === contractId);
      if (!contract) {
        return null;
      }

      contractConfigsStore.set(contractId, cloneContractConfig(config));
      return cloneContractConfig(config);
    },
  };
};
