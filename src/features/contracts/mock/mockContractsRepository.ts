import { clientContracts as seedContracts, createDefaultContractConfig as createSeedDefaultContractConfig } from '../../../data/clientContracts';
import { clients as seedClients } from '../../../data/clients';
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
  let nextContractSerial2026 = contractsStore.reduce((maxValue, contract) => {
    const matches = contract.number.match(/^(BR|DP)-2026\/(\d{5})$/);
    if (!matches) {
      return maxValue;
    }

    const serial = Number(matches[2]);
    return Number.isFinite(serial) ? Math.max(maxValue, serial) : maxValue;
  }, 0) + 1;

  const generateContractNumber = (type: ContractProductType = 'broker') => {
    const year = new Date().getFullYear();
    const nextIndex = contractsStore.length + 1;
    const serial = String(nextIndex).padStart(5, '0');
    return `${contractTypePrefixMap[type]}-${year}/${serial}`;
  };
  const generateAutoContractNumber = (type: 'broker' | 'depository') => {
    const prefix = type === 'broker' ? 'BR' : 'DP';
    const serial = String(nextContractSerial2026).padStart(5, '0');
    nextContractSerial2026 += 1;
    return `${prefix}-2026/${serial}`;
  };
  const appendAutoContractIfMissing = (clientId: string, type: 'broker' | 'depository', openDate: string) => {
    const hasActiveContract = contractsStore.some(
      (contract) => contract.clientId === clientId && contract.type === type && contract.status === 'active',
    );
    if (hasActiveContract) {
      return;
    }

    const client = seedClients.find((item) => item.id === clientId);
    const contractId = `ctr-${nextContractId}`;
    const contract: ClientContract = {
      id: contractId,
      clientId,
      number: generateAutoContractNumber(type),
      type,
      openDate,
      closeDate: null,
      status: 'active',
    };
    nextContractId += 1;
    contractsStore.push(contract);
    contractConfigsStore.set(
      contractId,
      createSeedDefaultContractConfig({
        clientEmail: client?.email,
        clientType: client?.type,
      }),
    );
  };
  const hydrateDemoContractsForActiveClients = () => {
    const activeClients = seedClients.filter((client) => client.subjectStatus === 'Активный клиент' && !client.isArchived);

    activeClients.forEach((client) => {
      appendAutoContractIfMissing(client.id, 'broker', '2026-01-10');
      appendAutoContractIfMissing(client.id, 'depository', '2026-01-15');
    });
  };

  hydrateDemoContractsForActiveClients();

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
