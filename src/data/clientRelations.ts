import type { ClientRelation } from './types';

export const clientRelations: ClientRelation[] = [
  { id: 'rel-1', clientId: 'c-001', relatedClientId: 'c-006', relatedName: 'Ковалёв Даниил Олегович', relatedType: 'Физическое лицо', role: 'Представитель', dateFrom: '2025-11-03' },
  { id: 'rel-2', clientId: 'c-001', relatedClientId: 'c-003', relatedName: 'ПАО «НеоЭнергоСбыт»', relatedType: 'Юридическое лицо', role: 'Агент', dateFrom: '2026-03-18' },
  { id: 'rel-3', clientId: 'c-003', relatedClientId: 'c-011', relatedName: 'АО «Восток Майнинг Системс»', relatedType: 'Юридическое лицо', role: 'Исполнительный орган', dateFrom: '2024-09-10' },
  { id: 'rel-4', clientId: 'c-003', relatedClientId: 'c-023', relatedName: 'АО «Глобал Ресурс Траст»', relatedType: 'Юридическое лицо', role: 'Агент', dateFrom: '2026-04-12' },
  { id: 'rel-5', clientId: 'c-005', relatedClientId: 'c-016', relatedName: 'АО «Каспий Порт Актив»', relatedType: 'Юридическое лицо', role: 'Бенефициар', dateFrom: '2025-01-25' },
  { id: 'rel-6', clientId: 'c-005', relatedClientId: 'c-010', relatedName: 'ООО «Точка Роста Девелопмент»', relatedType: 'Юридическое лицо', role: 'Агент', dateFrom: '2026-02-22' },
  { id: 'rel-7', clientId: 'c-008', relatedClientId: 'c-014', relatedName: 'ЗАО «Северо-Западный Трейд»', relatedType: 'Юридическое лицо', role: 'Доверенное лицо', dateFrom: '2026-03-01' },
  { id: 'rel-8', clientId: 'c-010', relatedClientId: 'c-020', relatedName: 'ПАО «Ритм Индустрия»', relatedType: 'Юридическое лицо', role: 'Представитель', dateFrom: '2026-01-17' },
  { id: 'rel-9', clientId: 'c-014', relatedClientId: 'c-008', relatedName: 'ИП Захаров Никита Алексеевич', relatedType: 'Индивидуальный предприниматель', role: 'Агент', dateFrom: '2026-03-01' },
  { id: 'rel-10', clientId: 'c-016', relatedClientId: 'c-022', relatedName: 'ИП Киселёв Антон Юрьевич', relatedType: 'Индивидуальный предприниматель', role: 'Доверенное лицо', dateFrom: '2026-04-08' },
  { id: 'rel-11', clientId: 'c-020', relatedClientId: 'c-009', relatedName: 'Громова Алина Сергеевна', relatedType: 'Физическое лицо', role: 'Бенефициар', dateFrom: '2025-06-14' },
  { id: 'rel-12', clientId: 'c-023', relatedClientId: 'c-011', relatedName: 'АО «Восток Майнинг Системс»', relatedType: 'Юридическое лицо', role: 'Исполнительный орган', dateFrom: '2025-12-09' },
];

export const getRelationsByClientId = (clientId: string) =>
  clientRelations.filter((relation) => relation.clientId === clientId);
