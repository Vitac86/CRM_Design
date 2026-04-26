import type { AdministrationSection } from '../../../data/administration';
export type { AdministrationSection };

export interface AdministrationRepository {
  listSections(): Promise<AdministrationSection[]>;
}
