import type { BadgeVariant } from '../components/ui/Badge';
import type { ClientType, ComplianceStatus, ResidencyStatus } from '../data/types';

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
  БАН: 'danger',
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

export const formatClientType = (type: ClientType): string => clientTypeLabelMap[type];

export const formatResidency = (residency: ResidencyStatus): string => residencyLabelMap[residency];

export const formatComplianceStatus = (status: ComplianceStatus): string => status;

export const getComplianceBadgeVariant = (status: ComplianceStatus): ComplianceBadgeVariant => complianceVariantMap[status];

export const getClientTypeBadgeVariant = (type: ClientType): BadgeVariant => clientTypeVariantMap[type];

export const getResidencyBadgeVariant = (residency: ResidencyStatus): BadgeVariant => residencyVariantMap[residency];
