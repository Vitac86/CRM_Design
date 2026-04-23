import type { ClientRelation } from './types';

export const clientRelations: ClientRelation[] = [
  { id: 'rel-1', clientId: 'c-001', relatedClientId: 'c-006', relatedName: 'Ковалёв Даниил Олегович', relatedType: 'Физическое лицо', role: 'Представитель', dateFrom: '2025-11-03' },
  { id: 'rel-2', clientId: 'c-001', relatedClientId: 'c-007', relatedName: 'ООО «Бриз Логистика»', relatedType: 'Юридическое лицо', role: 'Агент', dateFrom: '2026-02-15' },
  { id: 'rel-3', clientId: 'c-003', relatedClientId: 'c-011', relatedName: 'Терентьев Аркадий Валерьевич', relatedType: 'Физическое лицо', role: 'Исполнительный орган', dateFrom: '2024-09-10' },
  { id: 'rel-4', clientId: 'c-005', relatedClientId: 'c-016', relatedName: 'Назаров Семён Петрович', relatedType: 'Физическое лицо', role: 'Бенефициар', dateFrom: '2025-01-25' },
  { id: 'rel-5', clientId: 'c-008', relatedClientId: 'c-014', relatedName: 'Фадеев Константин Андреевич', relatedType: 'Физическое лицо', role: 'Доверенное лицо', dateFrom: '2026-03-01' },
];

export const getRelationsByClientId = (clientId: string) =>
  clientRelations.filter((relation) => relation.clientId === clientId);
