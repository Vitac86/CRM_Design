import type {
  ClientType,
  ComplianceStatus,
  ResidencyStatus,
  TradingInvestorStatus,
  TradingMethod,
  TradingRiskLevel,
  TradingStatus,
} from '../data/types';
import type { TableStatusTone } from '../components/ui/TableStatusText';

export const subjectStatusTone = {
  residency: {
    'Резидент РФ': 'neutral',
    Нерезидент: 'subtle',
  } satisfies Record<ResidencyStatus, TableStatusTone>,
  compliance: {
    ПРОЙДЕН: 'neutral',
    'НА ПРОВЕРКЕ': 'warning',
    'НА ДОРАБОТКЕ': 'warning',
    БАН: 'danger',
  } satisfies Record<ComplianceStatus, TableStatusTone>,
  fullDocumentSet: {
    true: 'neutral',
    false: 'danger',
  } satisfies Record<'true' | 'false', TableStatusTone>,
  clientType: {
    ООО: 'subtle',
    ПАО: 'subtle',
    ЗАО: 'subtle',
    АО: 'subtle',
    ФЛ: 'subtle',
    ИП: 'subtle',
  } satisfies Record<ClientType, TableStatusTone>,
};

export const tradingStatusTone = {
  investor: {
    Квал: 'neutral',
    Неквал: 'subtle',
  } satisfies Record<TradingInvestorStatus, TableStatusTone>,
  risk: {
    Стандартный: 'neutral',
    Начальный: 'subtle',
    Повышенный: 'warning',
    Особый: 'danger',
  } satisfies Record<TradingRiskLevel, TableStatusTone>,
  method: {
    QUIK: 'subtle',
    Голос: 'subtle',
  } satisfies Record<TradingMethod, TableStatusTone>,
  tradingStatus: {
    Активен: 'neutral',
    Истёк: 'danger',
  } satisfies Record<TradingStatus, TableStatusTone>,
  podFt: {
    true: 'neutral',
    false: 'warning',
  } satisfies Record<'true' | 'false', TableStatusTone>,
};
