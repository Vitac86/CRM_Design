import type { ClientAccount } from './types';

export const clientAccounts: ClientAccount[] = [
  { id: 'acc-1', clientId: 'c-001', number: '30-001-00003-BR', type: 'broker', openDate: '2025-01-15' },
  { id: 'acc-2', clientId: 'c-001', number: '30-001-00003-DP', type: 'depository', openDate: '2025-03-09' },
  { id: 'acc-3', clientId: 'c-001', number: '30-001-00142-DU', type: 'trust', openDate: '2024-07-22' },
  { id: 'acc-4', clientId: 'c-003', number: '30-001-00003-IIS', type: 'iis', openDate: '2024-05-18' },
  { id: 'acc-5', clientId: 'c-004', number: '30-001-00003-IN', type: 'other', openDate: '2023-09-03' },
  { id: 'acc-6', clientId: 'c-014', number: '30-014-00114-BR', type: 'broker', openDate: '2025-06-19' },
  { id: 'acc-7', clientId: 'c-016', number: '30-016-00041-DP', type: 'depository', openDate: '2026-01-28' },
  { id: 'acc-8', clientId: 'c-023', number: '30-023-00023-DU', type: 'trust', openDate: '2026-03-03' },
];

export const getAccountsByClientId = (clientId: string) => clientAccounts.filter((account) => account.clientId === clientId);
