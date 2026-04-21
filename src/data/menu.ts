export type MenuLeafItem = {
  id: string;
  label: string;
  to: string;
  icon: string;
};

export type MenuGroupItem = {
  id: string;
  label: string;
  icon: string;
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
    icon: '🗂️',
    children: [
      { id: 'dashboard', label: 'Дашборд', to: '/dashboard', icon: '📊' },
      { id: 'subjects', label: 'Субъекты', to: '/subjects', icon: '👥' },
      { id: 'brokerage', label: 'Брок. деятельность', to: '/brokerage', icon: '📈' },
      { id: 'trust-management', label: 'Дов. управление', to: '/trust-management', icon: '🧾' },
      { id: 'agents', label: 'Агенты', to: '/agents', icon: '🧑‍💼' },
      { id: 'documents', label: 'Документы', to: '/documents', icon: '📄' },
      { id: 'archives-emergency', label: 'Архивы/ЧС', to: '/archives', icon: '🗄️' },
      { id: 'requests', label: 'Заявки', to: '/requests', icon: '📝' },
      { id: 'compliance', label: 'Комплаенс', to: '/compliance', icon: '✅' },
    ],
  },
  { id: 'middle-office', label: 'Мидл-офис', to: '/middle-office', icon: '🏢' },
  { id: 'back-office', label: 'Бэк-офис', to: '/back-office', icon: '📚' },
  { id: 'trading', label: 'Трейдинг', to: '/trading', icon: '💹' },
  { id: 'depository', label: 'Депозитарий', to: '/depository', icon: '🏛️' },
  { id: 'administration', label: 'Администрирование', to: '/administration', icon: '⚙️' },
];
