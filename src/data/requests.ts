import type { Request } from './types';

export const requests: Request[] = [
  { id: 'r-001', clientId: 'c-001', number: 'REQ-260401', requestType: 'Открытие брокерского счёта', status: 'Исполнена', date: '2026-04-01', source: 'CRM' },
  { id: 'r-002', clientId: 'c-002', number: 'REQ-260402', requestType: 'Обновление анкеты клиента', status: 'В работе', date: '2026-04-02', source: 'Email' },
  { id: 'r-003', clientId: 'c-003', number: 'REQ-260403', requestType: 'Изменение лимитов', status: 'Новая', date: '2026-04-03', source: 'Личный кабинет' },
  { id: 'r-004', clientId: 'c-004', number: 'REQ-260404', requestType: 'Подключение отчётности', status: 'Отклонена', date: '2026-04-04', source: 'CRM' },
  { id: 'r-005', clientId: 'c-005', number: 'REQ-260405', requestType: 'Подключение срочного рынка', status: 'Исполнена', date: '2026-04-05', source: 'Телефон' },
  { id: 'r-006', clientId: 'c-006', number: 'REQ-260406', requestType: 'Смена контактных данных', status: 'Исполнена', date: '2026-04-06', source: 'CRM' },
  { id: 'r-007', clientId: 'c-008', number: 'REQ-260407', requestType: 'Переоценка риск-профиля', status: 'В работе', date: '2026-04-07', source: 'Email' },
  { id: 'r-008', clientId: 'c-010', number: 'REQ-260408', requestType: 'Добавление представителя', status: 'Новая', date: '2026-04-08', source: 'Личный кабинет' },
  { id: 'r-009', clientId: 'c-013', number: 'REQ-260409', requestType: 'Смена налогового статуса', status: 'В работе', date: '2026-04-09', source: 'CRM' },
  { id: 'r-010', clientId: 'c-017', number: 'REQ-260410', requestType: 'Запрос выписки ДЕПО', status: 'Исполнена', date: '2026-04-10', source: 'Email' },
  { id: 'r-011', clientId: 'c-021', number: 'REQ-260411', requestType: 'Подключение валютного рынка', status: 'Отклонена', date: '2026-04-11', source: 'Телефон' },
  { id: 'r-012', clientId: 'c-023', number: 'REQ-260412', requestType: 'Регистрация отчётного канала', status: 'В работе', date: '2026-04-12', source: 'CRM' },
  { id: 'r-013', clientId: 'c-024', number: 'REQ-260413', requestType: 'Закрытие неактивного поручения', status: 'Новая', date: '2026-04-13', source: 'Личный кабинет' }
];

export const getRequestsByClientId = (clientId: string): Request[] =>
  requests.filter((request) => request.clientId === clientId);
