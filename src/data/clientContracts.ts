import type { ClientContract, ContractWizardConfig, ContractPersonType } from './types';

const resolvePersonType = (clientType?: string): ContractPersonType => {
  if (clientType === 'ФЛ') {
    return 'individual';
  }

  if (clientType === 'ИП') {
    return 'entrepreneur';
  }

  return 'legal';
};

export const createDefaultContractConfig = (params?: { clientEmail?: string; clientType?: string }): ContractWizardConfig => ({
  joinedUnder428: {
    brokerageContract: true,
    depositoryContract: true,
  },
  personType: resolvePersonType(params?.clientType),
  depoAccount: {
    owner: true,
    nomineeHolder: false,
    trustManager: false,
  },
  depoOperatorEnabled: true,
  tradingDepoAccount: {
    owner: true,
    nomineeHolder: false,
    trustManager: false,
  },
  tradingDepoOperatorEnabled: true,
  clearingOrganizations: {
    nkc: true,
    nrd: false,
  },
  reporting: {
    office: false,
    post: false,
    emailEnabled: Boolean(params?.clientEmail?.trim()),
    email: params?.clientEmail?.trim() || '',
    edo: true,
  },
  brokerageMarkets: {
    tariff: 'Универсальный',
    stockMarket: true,
    futuresMarket: false,
    currencyAndMetalsMarket: true,
  },
  additionalJoinTerms: {
    electronicSignature: false,
    quikProgram: false,
  },
  incomeTransfer: {
    specialBrokerAccount: true,
    bankDetails: false,
  },
});

export const clientContracts: readonly ClientContract[] = [
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
  {
    id: 'ctr-7',
    clientId: 'c-014',
    number: 'BR-2025/00114',
    type: 'broker',
    openDate: '2025-06-19',
    closeDate: null,
    status: 'active',
  },
  {
    id: 'ctr-8',
    clientId: 'c-016',
    number: 'DP-2026/00041',
    type: 'depository',
    openDate: '2026-01-28',
    closeDate: null,
    status: 'active',
  },
  {
    id: 'ctr-9',
    clientId: 'c-023',
    number: 'DU-2026/00023',
    type: 'trust',
    openDate: '2026-03-03',
    closeDate: null,
    status: 'active',
  },
  {
    id: 'ctr-10',
    clientId: 'c-002',
    number: 'BR-2026/00440',
    type: 'broker',
    openDate: '2026-02-03',
    closeDate: null,
    status: 'active',
  },
  {
    id: 'ctr-11',
    clientId: 'c-003',
    number: 'BR-2025/01988',
    type: 'broker',
    openDate: '2025-11-22',
    closeDate: null,
    status: 'active',
  },
  {
    id: 'ctr-12',
    clientId: 'c-004',
    number: 'BR-2024/01210',
    type: 'broker',
    openDate: '2024-06-09',
    closeDate: null,
    status: 'active',
  },
  {
    id: 'ctr-13',
    clientId: 'c-005',
    number: 'BR-2023/00771',
    type: 'broker',
    openDate: '2023-03-17',
    closeDate: '2024-12-17',
    status: 'closed',
  },
];
