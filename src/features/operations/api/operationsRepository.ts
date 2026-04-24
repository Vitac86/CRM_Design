export type BrokerageContractStatus = 'Активен' | 'Приостановлен' | 'Закрыт';

export type BrokerageContract = {
  id: string;
  clientId: string;
  contractId: string;
  contractNumber: string;
  clientCode: string;
  clientName: string;
  manager: string;
  openedAt: string;
  status: BrokerageContractStatus;
};

export type TrustContractStatus = 'Активен' | 'На подписании' | 'Закрыт';

export type TrustContract = {
  id: string;
  contractNumber: string;
  clientName: string;
  strategy: string;
  portfolioValue: string;
  startDate: string;
  status: TrustContractStatus;
};

export interface OperationsRepository {
  listBrokerageContracts(): Promise<BrokerageContract[]>;
  listTrustContracts(): Promise<TrustContract[]>;
}
