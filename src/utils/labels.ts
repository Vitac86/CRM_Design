import type { BadgeVariant } from '../components/ui/Badge';
import type { ClientType, ComplianceStatus, ResidencyStatus, RiskCategory } from '../data/types';

type ComplianceBadgeVariant = Extract<BadgeVariant, 'success' | 'warning' | 'orange' | 'danger'>;

const clientTypeLabelMap: Record<ClientType, string> = {
  ООО: 'ЮР. ЛИЦО',
  ПАО: 'ЮР. ЛИЦО',
  ЗАО: 'ЮР. ЛИЦО',
  АО: 'ЮР. ЛИЦО',
  ФЛ: 'ФИЗ. ЛИЦО',
  ИП: 'ИП',
};

const residencyLabelMap: Record<ResidencyStatus, string> = {
  'Резидент РФ': 'РЕЗИДЕНТ',
  Нерезидент: 'НЕ РЕЗИДЕНТ',
};

const complianceVariantMap: Record<ComplianceStatus, ComplianceBadgeVariant> = {
  ПРОЙДЕН: 'success',
  'НА ПРОВЕРКЕ': 'warning',
  'НА ДОРАБОТКЕ': 'orange',
  ЗАБЛОКИРОВАН: 'danger',
};
const complianceLabelMap: Record<ComplianceStatus, string> = {
  ПРОЙДЕН: 'ПРОЙДЕН',
  'НА ПРОВЕРКЕ': 'НА ПРОВЕРКЕ',
  'НА ДОРАБОТКЕ': 'НА ДОРАБОТКЕ',
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

export const formatClientType = (type: ClientType): string => clientTypeLabelMap[type];

export const formatResidency = (residency: ResidencyStatus): string => residencyLabelMap[residency];

export const formatComplianceStatus = (status: ComplianceStatus): string => complianceLabelMap[status];

export const getComplianceBadgeVariant = (status: ComplianceStatus): ComplianceBadgeVariant => complianceVariantMap[status];

export const getClientTypeBadgeVariant = (type: ClientType): BadgeVariant => clientTypeVariantMap[type];

export const getResidencyBadgeVariant = (residency: ResidencyStatus): BadgeVariant => residencyVariantMap[residency];

export const formatRiskCategoryForHeader = (riskCategory: RiskCategory): string => riskCategoryLabelMap[riskCategory];

export const getRiskCategoryBadgeVariant = (riskCategory: RiskCategory): BadgeVariant => riskCategoryVariantMap[riskCategory];
