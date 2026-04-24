import type { BadgeVariant } from '../components/ui/Badge';
import type {
  ClientType,
  ComplianceStatus,
  ContractProductType,
  Request,
  ResidencyStatus,
  RiskCategory,
  SubjectStatus,
} from '../data/types';

type ComplianceBadgeVariant = Extract<BadgeVariant, 'success' | 'warning' | 'orange' | 'danger'>;

const clientTypeLabelMap: Record<ClientType, string> = {
  ООО: 'Юр. лицо',
  ПАО: 'Юр. лицо',
  ЗАО: 'Юр. лицо',
  АО: 'Юр. лицо',
  ФЛ: 'Физ. лицо',
  ИП: 'ИП',
};

const residencyLabelMap: Record<ResidencyStatus, string> = {
  'Резидент РФ': 'Резидент РФ',
  Нерезидент: 'Нерезидент',
};

const complianceVariantMap: Record<ComplianceStatus, ComplianceBadgeVariant> = {
  ПРОЙДЕН: 'success',
  'НА ПРОВЕРКЕ': 'warning',
  'НА ДОРАБОТКЕ': 'orange',
  ЗАБЛОКИРОВАН: 'danger',
};

const complianceLabelMap: Record<ComplianceStatus, string> = {
  ПРОЙДЕН: 'Пройден',
  'НА ПРОВЕРКЕ': 'На проверке',
  'НА ДОРАБОТКЕ': 'На доработке',
  ЗАБЛОКИРОВАН: 'Заблокирован',
};

const clientTypeVariantMap: Record<ClientType, BadgeVariant> = {
  ООО: 'info',
  ПАО: 'info',
  ЗАО: 'info',
  АО: 'info',
  ФЛ: 'purple',
  ИП: 'warning',
};

const residencyVariantMap: Record<ResidencyStatus, BadgeVariant> = {
  'Резидент РФ': 'success',
  Нерезидент: 'neutral',
};

const riskCategoryLabelMap: Record<RiskCategory, string> = {
  Низкий: 'КНУР',
  Средний: 'КСУР',
  Повышенный: 'КПУР',
  Высокий: 'КОУР',
};

const riskCategoryVariantMap: Record<RiskCategory, BadgeVariant> = {
  Низкий: 'success',
  Средний: 'warning',
  Повышенный: 'orange',
  Высокий: 'danger',
};

const subjectStatusLabelMap: Record<SubjectStatus, string> = {
  Регистрация: 'Регистрация',
  'Активный клиент': 'Активный клиент',
  'На комплаенсе': 'На комплаенсе',
  'Данные заполнены': 'Данные заполнены',
};

const contractKindLabelMap: Record<ContractProductType, string> = {
  broker: 'БО',
  depository: 'Депозитарный',
  trust: 'ДУ',
  iis: 'ИИС',
  other: 'Дилерский',
};

const requestStatusLabelMap: Record<Request['status'], string> = {
  Ожидает: 'Ожидает',
  Принято: 'Принято',
  Отклонено: 'Отклонено',
};

const titleCase = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  return normalized.length ? `${normalized[0].toUpperCase()}${normalized.slice(1)}` : value;
};

export const formatClientType = (type: ClientType): string => clientTypeLabelMap[type];

export const formatResidency = (residency: ResidencyStatus): string => residencyLabelMap[residency];

export const formatComplianceStatus = (status: ComplianceStatus): string => complianceLabelMap[status];

export const formatContractKind = (type: ContractProductType | string): string => {
  const normalized = type.trim().toLowerCase();

  if (normalized in contractKindLabelMap) {
    return contractKindLabelMap[normalized as ContractProductType];
  }

  if (normalized === 'бо' || normalized === 'брокерский') {
    return 'БО';
  }

  if (normalized === 'депозитарный') {
    return 'Депозитарный';
  }

  if (normalized === 'ду' || normalized === 'доверительный') {
    return 'ДУ';
  }

  if (normalized === 'иис') {
    return 'ИИС';
  }

  if (normalized === 'дилерский') {
    return 'Дилерский';
  }

  return type;
};

export const formatAccountStatus = (status: string): string => {
  const normalized = status.trim().toLowerCase();

  if (normalized === 'active' || normalized === 'активный' || normalized === 'открыт') {
    return 'Открыт';
  }

  if (normalized === 'closed' || normalized === 'закрытый' || normalized === 'закрыт') {
    return 'Закрыт';
  }

  if (normalized === 'blocked' || normalized === 'заблокирован') {
    return 'Заблокирован';
  }

  return titleCase(status);
};

export const formatRequestStatus = (status: Request['status'] | string): string => {
  if (status in requestStatusLabelMap) {
    return requestStatusLabelMap[status as Request['status']];
  }

  return titleCase(status);
};

export const getComplianceBadgeVariant = (status: ComplianceStatus): ComplianceBadgeVariant => complianceVariantMap[status];

export const getClientTypeBadgeVariant = (type: ClientType): BadgeVariant => clientTypeVariantMap[type];

export const getResidencyBadgeVariant = (residency: ResidencyStatus): BadgeVariant => residencyVariantMap[residency];

export const formatRiskCategoryForHeader = (riskCategory: RiskCategory): string => riskCategoryLabelMap[riskCategory];

export const formatSubjectStatus = (status: SubjectStatus): string => subjectStatusLabelMap[status];

export const getRiskCategoryBadgeVariant = (riskCategory: RiskCategory): BadgeVariant => riskCategoryVariantMap[riskCategory];
