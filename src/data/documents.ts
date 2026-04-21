import type { Document } from './types';

export const documents: Document[] = [
  { id: 'd-001', clientId: 'c-001', title: 'Устав общества', kind: 'Учредительный', status: 'Принят', date: '2026-03-01' },
  { id: 'd-002', clientId: 'c-001', title: 'Карточка подписей', kind: 'Банковский', status: 'На проверке', date: '2026-04-10' },
  { id: 'd-003', clientId: 'c-002', title: 'Свидетельство ИП', kind: 'Регистрационный', status: 'Принят', date: '2026-02-17' },
  { id: 'd-004', clientId: 'c-003', title: 'Решение совета директоров', kind: 'Корпоративный', status: 'Принят', date: '2026-04-02' },
  { id: 'd-005', clientId: 'c-004', title: 'Бухгалтерская отчётность', kind: 'Финансовый', status: 'Отклонен', date: '2026-03-28' },
  { id: 'd-006', clientId: 'c-005', title: 'Анкета квалифицированного инвестора', kind: 'Комплаенс', status: 'Принят', date: '2026-04-14' },
  { id: 'd-007', clientId: 'c-006', title: 'Паспорт (маска)', kind: 'Идентификация', status: 'Принят', date: '2026-01-22' },
  { id: 'd-008', clientId: 'c-008', title: 'Подтверждение адреса', kind: 'KYC', status: 'На проверке', date: '2026-04-11' },
  { id: 'd-009', clientId: 'c-010', title: 'Доверенность представителя', kind: 'Юридический', status: 'Истекает', date: '2026-05-01' },
  { id: 'd-010', clientId: 'c-013', title: 'Справка о налоговом резидентстве', kind: 'Налоговый', status: 'Отклонен', date: '2026-03-20' },
  { id: 'd-011', clientId: 'c-017', title: 'Согласие на обработку данных', kind: 'Юридический', status: 'Принят', date: '2026-04-05' },
  { id: 'd-012', clientId: 'c-019', title: 'Заявление на обновление анкеты', kind: 'Операционный', status: 'На проверке', date: '2026-04-16' },
  { id: 'd-013', clientId: 'c-021', title: 'Список бенефициаров', kind: 'Комплаенс', status: 'Принят', date: '2026-03-30' },
  { id: 'd-014', clientId: 'c-023', title: 'Финмодель проекта', kind: 'Финансовый', status: 'На проверке', date: '2026-04-19' }
];

export const getDocumentsByClientId = (clientId: string): Document[] =>
  documents.filter((document) => document.clientId === clientId);
