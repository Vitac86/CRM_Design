export type AdministrationSection = {
  id: string;
  title: string;
  description: string;
  itemsCount: string;
};

export const administrationSections: AdministrationSection[] = [
  {
    id: 'adm-users',
    title: 'Пользователи',
    description: 'Управление учётными записями, доступами и блокировками сотрудников.',
    itemsCount: '126 записей',
  },
  {
    id: 'adm-roles',
    title: 'Роли',
    description: 'Матрица ролей и прав в CRM по подразделениям.',
    itemsCount: '18 ролей',
  },
  {
    id: 'adm-dicts',
    title: 'Справочники',
    description: 'Редактирование системных классификаторов и источников данных.',
    itemsCount: '34 справочника',
  },
  {
    id: 'adm-audit',
    title: 'Журнал действий',
    description: 'История изменений и действий пользователей в системе.',
    itemsCount: '15 942 события',
  },
];
