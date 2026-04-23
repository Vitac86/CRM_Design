import type { ClientContract, ContractProductType } from './types';

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

const contractTypePrefixMap: Record<ContractProductType, string> = {
  broker: 'BR',
  depository: 'DP',
  trust: 'DU',
  iis: 'IIS',
  other: 'IN',
};

export const generateContractNumber = (type: ContractProductType = 'broker') => {
  const year = new Date().getFullYear();
  const nextIndex = clientContracts.length + 1;
  const serial = String(nextIndex).padStart(5, '0');

  return `${contractTypePrefixMap[type]}-${year}/${serial}`;
};

export const createClientContract = (payload: {
  clientId: string;
  type?: ContractProductType;
  number?: string;
  openDate?: string;
  closeDate?: string | null;
  status?: ClientContract['status'];
}) => {
  const type = payload.type ?? 'broker';
  const contract: ClientContract = {
    id: `ctr-${Date.now()}`,
    clientId: payload.clientId,
    number: payload.number?.trim() || generateContractNumber(type),
    type,
    openDate: payload.openDate ?? new Date().toISOString().slice(0, 10),
    closeDate: payload.closeDate ?? null,
    status: payload.status ?? 'active',
  };

  clientContracts.unshift(contract);
  return contract;
};
