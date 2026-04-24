import {
  administrationSections as seedAdministrationSections,
  type AdministrationSection,
} from '../../../data/administration';
import type { AdministrationRepository } from '../api/administrationRepository';

const cloneSection = (section: AdministrationSection): AdministrationSection => structuredClone(section);

export const createMockAdministrationRepository = (): AdministrationRepository => {
  const sectionsStore = seedAdministrationSections.map(cloneSection);

  return {
    async listSections() {
      return sectionsStore.map(cloneSection);
    },
  };
};
