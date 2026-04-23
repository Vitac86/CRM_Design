import type { SidebarIconName } from '../components/layout/SidebarIcon';

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

export const isMenuGroup = (item: SidebarItem): item is MenuGroupItem => {
  return 'children' in item;
};

export const sidebarMenu: SidebarItem[] = [
  {
    id: 'front-office',
    label: 'Фронт-офис',
    icon: 'frontOffice',
    children: [
      { id: 'dashboard', label: 'Дашборд', to: '/dashboard', icon: 'dashboard' },
      { id: 'subjects', label: 'Субъекты', to: '/subjects', icon: 'subjects' },
      { id: 'brokerage', label: 'Брок. деятельность', to: '/brokerage', icon: 'brokerage' },
      {
        id: 'trust-management',
        label: 'Дов. управление',
        to: '/trust-management',
        icon: 'trustManagement',
      },
      { id: 'agents', label: 'Агенты', to: '/agents', icon: 'agents' },
      { id: 'archives-emergency', label: 'Архив', to: '/archives', icon: 'archives' },
      { id: 'requests', label: 'Поручения', to: '/requests', icon: 'requests' },
    ],
  },
  { id: 'compliance', label: 'Комплаенс', to: '/compliance', icon: 'compliance' },
  { id: 'middle-office', label: 'Мидл-офис', to: '/middle-office', icon: 'middleOffice' },
  { id: 'back-office', label: 'Бэк-офис', to: '/back-office', icon: 'backOffice' },
  { id: 'trading', label: 'Трейдинг', to: '/trading', icon: 'trading' },
  { id: 'depository', label: 'Депозитарий', to: '/depository', icon: 'depository' },
  { id: 'administration', label: 'Администрирование', to: '/administration', icon: 'administration' },
];
