import type { ClientContract } from './types';

export const clientContracts: ClientContract[] = [
  {
    id: 'ctr-1',
    clientId: 'c-001',
    number: 'BR-2025/00003',
    type: 'broker',
    openDate: '2025-01-15',
    closeDate: null,
    status: 'active',
  },
  {
    id: 'ctr-2',
    clientId: 'c-001',
    number: 'DP-2025/00018',
    type: 'depository',
    openDate: '2025-03-09',
    closeDate: null,
    status: 'active',
  },
  {
    id: 'ctr-3',
    clientId: 'c-001',
    number: 'DU-2024/00142',
    type: 'trust',
    openDate: '2024-07-22',
    closeDate: '2025-11-30',
    status: 'closed',
  },
  {
    id: 'ctr-4',
    clientId: 'c-003',
    number: 'IIS-2024/00067',
    type: 'iis',
    openDate: '2024-05-18',
    closeDate: null,
    status: 'active',
  },
  {
    id: 'ctr-5',
    clientId: 'c-004',
    number: 'BR-2023/00891',
    type: 'broker',
    openDate: '2023-09-03',
    closeDate: '2024-12-17',
    status: 'closed',
  },
  {
    id: 'ctr-6',
    clientId: 'c-006',
    number: 'IN-2026/00011',
    type: 'other',
    openDate: '2026-02-04',
    closeDate: null,
    status: 'active',
  },
];

export const getContractsByClientId = (clientId: string) => clientContracts.filter((contract) => contract.clientId === clientId);
