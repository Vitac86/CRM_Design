import type { ClientsRepository } from '../../features/clients/api/clientsRepository';
import type { ContractsRepository } from '../../features/contracts/api/contractsRepository';
import type { DashboardRepository } from '../../features/dashboard/api/dashboardRepository';
import type { RequestsRepository } from '../../features/requests/api/requestsRepository';
import type { AccountsRepository } from '../../features/accounts/api/accountsRepository';
import type { AgentsRepository } from '../../features/agents/api/agentsRepository';
import type { RelationsRepository } from '../../features/relations/api/relationsRepository';
import type { ComplianceRepository } from '../../features/compliance/api/complianceRepository';
import type { DocumentsRepository } from '../../features/documents/api/documentsRepository';

export type DataAccessContextValue = {
  clients: ClientsRepository;
  requests: RequestsRepository;
  contracts: ContractsRepository;
  dashboard: DashboardRepository;
  accounts: AccountsRepository;
  agents: AgentsRepository;
  relations: RelationsRepository;
  compliance: ComplianceRepository;
  documents: DocumentsRepository;
};
