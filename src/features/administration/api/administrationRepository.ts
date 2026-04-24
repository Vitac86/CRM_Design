export type AdministrationSection = {
  id: string;
  title: string;
  description: string;
  itemsCount: string;
};

export interface AdministrationRepository {
  listSections(): Promise<AdministrationSection[]>;
}
