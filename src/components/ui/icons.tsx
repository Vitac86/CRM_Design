import type { ReactNode } from 'react';

type IconProps = {
  className?: string;
};

const IconBase = ({ className = 'h-4 w-4', children, strokeWidth = 1.8 }: IconProps & { children: ReactNode; strokeWidth?: 1.5 | 1.8 }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const SearchIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className} strokeWidth={1.8}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </IconBase>
);

export const DashboardIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </IconBase>
);

export const UsersIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <path d="M12 4.35a4 4 0 1 1 0 5.3" />
    <path d="M15 21H3v-1a6 6 0 0 1 12 0z" />
    <path d="M15 21h6v-1a6 6 0 0 0-9-5.2" />
    <circle cx="9" cy="7" r="4" />
  </IconBase>
);

export const BriefcaseIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <path d="M21 13.25A24 24 0 0 1 12 15a24 24 0 0 1-9-1.75" />
    <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    <path d="M12 12h.01" />
    <rect x="3" y="6" width="18" height="14" rx="2" />
  </IconBase>
);

export const ShieldIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </IconBase>
);

export const FileIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <path d="M9 12h6M9 16h6" />
    <path d="M7 3h5.6a1 1 0 0 1 .7.3l5.4 5.4a1 1 0 0 1 .3.7V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
  </IconBase>
);

export const ArchiveIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <path d="M5 8h14" />
    <rect x="3" y="4" width="18" height="4" rx="2" />
    <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
    <path d="M10 12h4" />
  </IconBase>
);

export const RequestIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5" />
    <path d="m17.6 3.6 2.8 2.8-8.6 8.6H9v-2.8z" />
  </IconBase>
);

export const ComplianceIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 12 2 2 4-4" />
  </IconBase>
);

export const BuildingIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16" />
    <path d="M3 21h18" />
    <path d="M9 7h1M9 11h1M14 7h1M14 11h1" />
    <path d="M10 21v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
  </IconBase>
);

export const BackOfficeIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <path d="m20 7-8-4-8 4 8 4z" />
    <path d="m4 7 8 4v10l-8-4z" />
    <path d="m20 7-8 4v10l8-4z" />
  </IconBase>
);

export const TradingIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </IconBase>
);

export const DepositoryIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <path d="M2 7v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7" />
    <path d="m2 7 10 6 10-6" />
    <path d="M2 7h20" />
  </IconBase>
);

export const AdminIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <path d="M10.3 4.3c.4-1.8 2.9-1.8 3.4 0a1.7 1.7 0 0 0 2.5 1.1c1.6-.9 3.3.8 2.4 2.4a1.7 1.7 0 0 0 1.1 2.5c1.8.5 1.8 2.9 0 3.4a1.7 1.7 0 0 0-1.1 2.5c.9 1.6-.8 3.3-2.4 2.4a1.7 1.7 0 0 0-2.5 1.1c-.5 1.8-2.9 1.8-3.4 0a1.7 1.7 0 0 0-2.5-1.1c-1.6.9-3.3-.8-2.4-2.4a1.7 1.7 0 0 0-1.1-2.5c-1.8-.5-1.8-2.9 0-3.4a1.7 1.7 0 0 0 1.1-2.5c-.9-1.6.8-3.3 2.4-2.4a1.7 1.7 0 0 0 2.5-1.1z" />
    <circle cx="12" cy="12" r="3" />
  </IconBase>
);

export const CheckIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <polyline points="20 6 9 17 4 12" />
  </IconBase>
);

export const XIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </IconBase>
);

export const ClockIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </IconBase>
);

export const AlertIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
    <path d="m10.3 3.8-8 14a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0z" />
  </IconBase>
);

export const PlusIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <path d="M12 4v16" />
    <path d="M4 12h16" />
  </IconBase>
);

export const EditIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <path d="M12 20h9" />
    <path d="m16.5 3.5 4 4L7 21H3v-4z" />
  </IconBase>
);

export const ChevronDownIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <path d="m6 9 6 6 6-6" />
  </IconBase>
);

export const ChevronUpIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <path d="m6 15 6-6 6 6" />
  </IconBase>
);

export const SortIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <path d="m6 8 4-4 4 4" />
    <path d="m6 12 4 4 4-4" />
  </IconBase>
);

export const DownloadIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </IconBase>
);

export const RefreshIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <path d="M21 12a9 9 0 0 1-15.5 6.4" />
    <path d="M3 12a9 9 0 0 1 15.5-6.4" />
    <path d="M3 4v4h4" />
    <path d="M21 20v-4h-4" />
  </IconBase>
);

export const MailIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <polyline points="22,6 12,13 2,6" />
  </IconBase>
);

export const MonitorIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8" />
    <path d="M12 17v4" />
  </IconBase>
);

export const PhoneIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7 12.8 12.8 0 0 0 .7 2.8 2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5 12.8 12.8 0 0 0 2.8.7 2 2 0 0 1 1.7 2.1z" />
  </IconBase>
);

export const GlobeIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <IconBase className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
  </IconBase>
);
