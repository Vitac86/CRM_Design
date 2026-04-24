import type { SidebarIconName } from '../../../components/layout/SidebarIcon';

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

export interface NavigationRepository {
  listSidebarItems(): Promise<SidebarItem[]>;
}
