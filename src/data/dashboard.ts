import type { DashboardMetric } from './types';

export const dashboardMetrics: DashboardMetric[] = [
  { id: 'm-001', label: 'Всего клиентов', value: 24, trend: 'up', delta: 3 },
  { id: 'm-002', label: 'Новые заявки за день', value: 7, trend: 'up', delta: 2 },
  { id: 'm-003', label: 'На комплаенс-проверке', value: 5, trend: 'flat', delta: 0 },
  { id: 'm-004', label: 'Отчёты с ошибками', value: 1, trend: 'down', delta: -1 },
  { id: 'm-005', label: 'Квалифицированные инвесторы', value: 10, unit: 'клиентов', trend: 'up', delta: 1 },
  { id: 'm-006', label: 'Документы на проверке', value: 5, trend: 'flat', delta: 0 }
];

export const dashboardAlerts = [
  'У 3 клиентов истекают документы в ближайшие 7 дней.',
  '1 отчёт Бэк-офиса вернулся с ошибкой доставки.',
  '2 новых запроса на изменение риск-профиля ожидают обработки.'
];
