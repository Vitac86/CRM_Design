import type { ClientsRepository } from '../../features/clients/api/clientsRepository';
import type { ContractsRepository } from '../../features/contracts/api/contractsRepository';
import type { DashboardRepository } from '../../features/dashboard/api/dashboardRepository';
import type { RequestsRepository } from '../../features/requests/api/requestsRepository';
import type { AccountsRepository } from '../../features/accounts/api/accountsRepository';
import type { AgentsRepository } from '../../features/agents/api/agentsRepository';
import type { RelationsRepository } from '../../features/relations/api/relationsRepository';
import type { ComplianceRepository } from '../../features/compliance/api/complianceRepository';
import type { DocumentsRepository } from '../../features/documents/api/documentsRepository';
import type { ReportsRepository } from '../../features/reports/api/reportsRepository';
import type { TradingRepository } from '../../features/trading/api/tradingRepository';
import type { AdministrationRepository } from '../../features/administration/api/administrationRepository';
import type { OperationsRepository } from '../../features/operations/api/operationsRepository';
import type { NavigationRepository } from '../../features/navigation/api/navigationRepository';
import type { HistoryRepository } from '../../features/history/api/historyRepository';

export type DataAccessContextValue = {
  // Domain repositories only. UI must not read seed arrays directly.
  clients: ClientsRepository;
  requests: RequestsRepository;
  contracts: ContractsRepository;
  dashboard: DashboardRepository;
  accounts: AccountsRepository;
  agents: AgentsRepository;
  relations: RelationsRepository;
  compliance: ComplianceRepository;
  documents: DocumentsRepository;
  reports: ReportsRepository;
  trading: TradingRepository;
  administration: AdministrationRepository;
  operations: OperationsRepository;
  navigation: NavigationRepository;
  history: HistoryRepository;
};
