import { createContext, useMemo, type ReactNode } from 'react';
import { createMockClientsRepository } from '../../features/clients/mock/mockClientsRepository';
import { createMockContractsRepository } from '../../features/contracts/mock/mockContractsRepository';
import { createMockDashboardRepository } from '../../features/dashboard/mock/mockDashboardRepository';
import { createMockRequestsRepository } from '../../features/requests/mock/mockRequestsRepository';
import type { DataAccessContextValue } from './types';

export const DataAccessContext = createContext<DataAccessContextValue | undefined>(undefined);

export const DataAccessProvider = ({ children }: { children: ReactNode }) => {
  const value = useMemo<DataAccessContextValue>(
    () => ({
      clients: createMockClientsRepository(),
      requests: createMockRequestsRepository(),
      contracts: createMockContractsRepository(),
      dashboard: createMockDashboardRepository(),
    }),
    [],
  );

  return <DataAccessContext.Provider value={value}>{children}</DataAccessContext.Provider>;
};
