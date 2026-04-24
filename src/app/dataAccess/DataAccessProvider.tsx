import { createContext, useMemo, type ReactNode } from 'react';
import { createMockClientsRepository } from '../../features/clients/mock/mockClientsRepository';
import { createMockContractsRepository } from '../../features/contracts/mock/mockContractsRepository';
import { createMockDashboardRepository } from '../../features/dashboard/mock/mockDashboardRepository';
import { createMockRequestsRepository } from '../../features/requests/mock/mockRequestsRepository';
import { createMockAccountsRepository } from '../../features/accounts/mock/mockAccountsRepository';
import { createMockAgentsRepository } from '../../features/agents/mock/mockAgentsRepository';
import { createMockRelationsRepository } from '../../features/relations/mock/mockRelationsRepository';
import { createMockComplianceRepository } from '../../features/compliance/mock/mockComplianceRepository';
import { createMockDocumentsRepository } from '../../features/documents/mock/mockDocumentsRepository';
import { createMockReportsRepository } from '../../features/reports/mock/mockReportsRepository';
import { createMockTradingRepository } from '../../features/trading/mock/mockTradingRepository';
import { createMockAdministrationRepository } from '../../features/administration/mock/mockAdministrationRepository';
import { createMockOperationsRepository } from '../../features/operations/mock/mockOperationsRepository';
import { createMockNavigationRepository } from '../../features/navigation/mock/mockNavigationRepository';
import { createMockHistoryRepository } from '../../features/history/mock/mockHistoryRepository';
import type { DataAccessContextValue } from './types';

export const DataAccessContext = createContext<DataAccessContextValue | undefined>(undefined);

export const DataAccessProvider = ({ children }: { children: ReactNode }) => {
  const value = useMemo<DataAccessContextValue>(() => {
    const clientsRepository = createMockClientsRepository();

    return {
      clients: clientsRepository,
      requests: createMockRequestsRepository(),
      contracts: createMockContractsRepository(),
      dashboard: createMockDashboardRepository(),
      accounts: createMockAccountsRepository(),
      agents: createMockAgentsRepository({ clientsRepository }),
      relations: createMockRelationsRepository(),
      compliance: createMockComplianceRepository(),
      documents: createMockDocumentsRepository(),
      reports: createMockReportsRepository(),
      trading: createMockTradingRepository(),
      administration: createMockAdministrationRepository(),
      operations: createMockOperationsRepository(),
      navigation: createMockNavigationRepository(),
      history: createMockHistoryRepository(),
    };
  }, []);

  return <DataAccessContext.Provider value={value}>{children}</DataAccessContext.Provider>;
};
