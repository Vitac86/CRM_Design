import { sidebarMenu as seedSidebarMenu, type SidebarItem } from '../../../data/menu';
import type { NavigationRepository } from '../api/navigationRepository';

const cloneSidebarItem = (item: SidebarItem): SidebarItem => structuredClone(item);

export const createMockNavigationRepository = (): NavigationRepository => {
  const menuStore = seedSidebarMenu.map(cloneSidebarItem);

  return {
    async listSidebarItems() {
      return menuStore.map(cloneSidebarItem);
    },
  };
};
