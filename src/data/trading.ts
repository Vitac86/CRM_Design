import type { TradingClientCard, TradingProfile } from './types';

export const tradingProfiles: TradingProfile[] = [
  {
    id: 'tp-001',
    clientId: 'c-003',
    riskCategory: 'Высокий',
    qualifiedInvestor: true,
    allowCashUsage: true,
    allowSecuritiesUsage: true,
    strategy: 'Агрессивная',
    leverageAllowed: true,
    updatedAt: '2026-04-21 09:15'
  },
  {
    id: 'tp-002',
    clientId: 'c-005',
    riskCategory: 'Повышенный',
    qualifiedInvestor: true,
    allowCashUsage: true,
    allowSecuritiesUsage: true,
    strategy: 'Сбалансированная',
    leverageAllowed: true,
    updatedAt: '2026-04-20 17:50'
  },
  {
    id: 'tp-003',
    clientId: 'c-006',
    riskCategory: 'Средний',
    qualifiedInvestor: false,
    allowCashUsage: true,
    allowSecuritiesUsage: false,
    strategy: 'Сбалансированная',
    leverageAllowed: false,
    updatedAt: '2026-04-20 18:03'
  },
  {
    id: 'tp-004',
    clientId: 'c-009',
    riskCategory: 'Высокий',
    qualifiedInvestor: true,
    allowCashUsage: true,
    allowSecuritiesUsage: true,
    strategy: 'Агрессивная',
    leverageAllowed: true,
    updatedAt: '2026-04-21 08:40'
  },
  {
    id: 'tp-005',
    clientId: 'c-017',
    riskCategory: 'Высокий',
    qualifiedInvestor: true,
    allowCashUsage: true,
    allowSecuritiesUsage: true,
    strategy: 'Агрессивная',
    leverageAllowed: true,
    updatedAt: '2026-04-21 10:35'
  },
  {
    id: 'tp-006',
    clientId: 'c-022',
    riskCategory: 'Средний',
    qualifiedInvestor: true,
    allowCashUsage: true,
    allowSecuritiesUsage: true,
    strategy: 'Сбалансированная',
    leverageAllowed: false,
    updatedAt: '2026-04-21 12:05'
  }
];

export const tradingClientCards: TradingClientCard[] = [
  {
    clientId: 'c-003',
    brokerAccount: 'BRK-771003',
    marketAccess: ['Фондовый рынок', 'Срочный рынок', 'Валютный рынок'],
    settlementModel: 'T+1',
    marginCallThreshold: 85
  },
  {
    clientId: 'c-006',
    brokerAccount: 'BRK-771006',
    marketAccess: ['Фондовый рынок'],
    settlementModel: 'T+2',
    marginCallThreshold: 70
  },
  {
    clientId: 'c-017',
    brokerAccount: 'BRK-781017',
    marketAccess: ['Фондовый рынок', 'Срочный рынок'],
    settlementModel: 'DVP',
    marginCallThreshold: 90
  }
];

export const getTradingProfileByClientId = (
  clientId: string
): TradingProfile | undefined => tradingProfiles.find((profile) => profile.clientId === clientId);
