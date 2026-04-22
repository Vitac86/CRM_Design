import type { ComponentType } from 'react';
import {
  AdminIcon,
  ArchiveIcon,
  BackOfficeIcon,
  BriefcaseIcon,
  BuildingIcon,
  ComplianceIcon,
  DashboardIcon,
  DepositoryIcon,
  FileIcon,
  RequestIcon,
  ShieldIcon,
  TradingIcon,
  UsersIcon,
} from '../ui/icons';

export type SidebarIconName =
  | 'frontOffice'
  | 'dashboard'
  | 'subjects'
  | 'brokerage'
  | 'trustManagement'
  | 'agents'
  | 'documents'
  | 'archives'
  | 'requests'
  | 'compliance'
  | 'middleOffice'
  | 'backOffice'
  | 'trading'
  | 'depository'
  | 'administration';

type SidebarIconProps = {
  name: SidebarIconName;
  className?: string;
};

const iconByName: Record<SidebarIconName, ComponentType<{ className?: string }>> = {
  frontOffice: UsersIcon,
  dashboard: DashboardIcon,
  subjects: UsersIcon,
  brokerage: BriefcaseIcon,
  trustManagement: ShieldIcon,
  agents: UsersIcon,
  documents: FileIcon,
  archives: ArchiveIcon,
  requests: RequestIcon,
  compliance: ComplianceIcon,
  middleOffice: BuildingIcon,
  backOffice: BackOfficeIcon,
  trading: TradingIcon,
  depository: DepositoryIcon,
  administration: AdminIcon,
};

export const SidebarIcon = ({ name, className }: SidebarIconProps) => {
  const IconComponent = iconByName[name];

  return <IconComponent className={className} />;
};
