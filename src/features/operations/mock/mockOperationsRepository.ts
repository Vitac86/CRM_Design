import {
  brokerageContracts as seedBrokerageContracts,
  type BrokerageContract,
} from '../../../data/brokerage';
import { trustContracts as seedTrustContracts, type TrustContract } from '../../../data/trustManagement';
import type { OperationsRepository } from '../api/operationsRepository';

const cloneBrokerageContract = (contract: BrokerageContract): BrokerageContract => structuredClone(contract);
const cloneTrustContract = (contract: TrustContract): TrustContract => structuredClone(contract);

export const createMockOperationsRepository = (): OperationsRepository => {
  const brokerageStore = seedBrokerageContracts.map(cloneBrokerageContract);
  const trustStore = seedTrustContracts.map(cloneTrustContract);

  return {
    async listBrokerageContracts() {
      return brokerageStore.map(cloneBrokerageContract);
    },
    async listTrustContracts() {
      return trustStore.map(cloneTrustContract);
    },
  };
};
