import type { ClientsRepository } from '../../features/clients/api/clientsRepository';
import type { ContractsRepository } from '../../features/contracts/api/contractsRepository';
import type { RequestsRepository } from '../../features/requests/api/requestsRepository';

export type DataAccessContextValue = {
  clients: ClientsRepository;
  requests: RequestsRepository;
  contracts: ContractsRepository;
};
