import type { SidebarIconName } from '../components/layout/SidebarIcon';
import { routes } from '../routes/paths';

export type MenuLeafItem = {
  id: string;
  label: string;
  to: string;
  icon: SidebarIconName;
};

export type MenuGroupItem = {
  id: string;
  label: string;
  icon: SidebarIconName;
  children: MenuLeafItem[];
};

export type SidebarItem = MenuLeafItem | MenuGroupItem;

export const sidebarMenu: ReadonlyArray<SidebarItem> = [
  {
    id: 'front-office',
    label: 'Фронт-офис',
    icon: 'frontOffice',
    children: [
      { id: 'dashboard', label: 'Дашборд', to: routes.dashboard, icon: 'dashboard' },
      { id: 'subjects', label: 'Субъекты', to: routes.subjects, icon: 'subjects' },
      { id: 'brokerage', label: 'Брок. деятельность', to: routes.brokerage, icon: 'brokerage' },
      {
        id: 'trust-management',
        label: 'Дов. управление',
        to: routes.trustManagement,
        icon: 'trustManagement',
      },
      { id: 'agents', label: 'Агенты', to: routes.agents, icon: 'agents' },
      { id: 'archives-emergency', label: 'Архив', to: routes.archives, icon: 'archives' },
      { id: 'requests', label: 'Поручения', to: routes.requests, icon: 'requests' },
    ],
  },
  { id: 'compliance', label: 'Комплаенс', to: routes.compliance, icon: 'compliance' },
  {
    id: 'middle-office',
    label: 'Мидл-офис',
    icon: 'middleOffice',
    children: [
      { id: 'middle-office-clients', label: 'Журнал клиентов', to: routes.middleOfficeClients, icon: 'documents' },
      {
        id: 'middle-office-reports',
        label: 'Журнал отправленных отчётов',
        to: routes.middleOfficeReports,
        icon: 'documents',
      },
    ],
  },
  { id: 'back-office', label: 'Бэк-офис', to: routes.backOffice, icon: 'backOffice' },
  { id: 'trading', label: 'Трейдинг', to: routes.trading, icon: 'trading' },
  { id: 'depository', label: 'Депозитарий', to: routes.depository, icon: 'depository' },
  { id: 'administration', label: 'Администрирование', to: routes.administration, icon: 'administration' },
];
