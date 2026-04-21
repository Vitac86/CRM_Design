import type { ClientRelation } from './types';

export const clientRelations: ClientRelation[] = [
  { id: 'rel-1', clientId: 'c-001', relatedName: 'Климов Роман Сергеевич', relatedCode: 'REL-7701', relatedType: 'Физическое лицо', role: 'Представитель', dateFrom: '2025-11-03', status: 'Активна' },
  { id: 'rel-2', clientId: 'c-001', relatedName: 'ООО «Вектор Консалтинг»', relatedCode: 'REL-7702', relatedType: 'Юридическое лицо', role: 'Агент', dateFrom: '2026-02-15', status: 'На проверке' },
  { id: 'rel-3', clientId: 'c-003', relatedName: 'Васильев Артём Николаевич', relatedCode: 'REL-7811', relatedType: 'Физическое лицо', role: 'Исполнительный орган', dateFrom: '2024-09-10', status: 'Активна' },
  { id: 'rel-4', clientId: 'c-005', relatedName: 'Сафонов Игорь Петрович', relatedCode: 'REL-5409', relatedType: 'Физическое лицо', role: 'Бенефициар', dateFrom: '2025-01-25', status: 'Активна' },
  { id: 'rel-5', clientId: 'c-008', relatedName: 'Захаров Антон Михайлович', relatedCode: 'REL-1653', relatedType: 'Физическое лицо', role: 'Доверенное лицо', dateFrom: '2026-03-01', status: 'Неактивна' },
];

export const getRelationsByClientId = (clientId: string) =>
  clientRelations.filter((relation) => relation.clientId === clientId);
