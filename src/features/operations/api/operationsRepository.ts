import type { BrokerageContract, BrokerageContractStatus } from '../../../data/brokerage';
import type { TrustContract, TrustContractStatus } from '../../../data/trustManagement';

export type { BrokerageContract, BrokerageContractStatus, TrustContract, TrustContractStatus };

export interface OperationsRepository {
  listBrokerageContracts(): Promise<BrokerageContract[]>;
  listTrustContracts(): Promise<TrustContract[]>;
}
