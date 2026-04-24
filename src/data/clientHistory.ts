import type { ClientHistoryEvent } from './types';

export const clientHistory: ReadonlyArray<ClientHistoryEvent> = [
  { id: 'hst-1', clientId: 'c-001', dateTime: '2026-04-20 09:14', section: 'Профиль', field: 'Телефон', oldValue: '+7 (900) 100-11-91', newValue: '+7 (900) 100-11-01', user: 'Иванов И.И.' },
  { id: 'hst-2', clientId: 'c-001', dateTime: '2026-04-18 13:47', section: 'Документы', field: 'Статус доверенности', oldValue: 'На подписи', newValue: 'На проверке', user: 'Петров П.П.' },
  { id: 'hst-3', clientId: 'c-003', dateTime: '2026-04-21 08:55', section: 'Договоры', field: 'Статус договора БО-2026/074', oldValue: 'Не действующий', newValue: 'На подписании', user: 'Смирнова А.А.' },
  { id: 'hst-4', clientId: 'c-005', dateTime: '2026-04-16 17:31', section: 'Связи', field: 'Роль связанного лица', oldValue: 'Агент', newValue: 'Бенефициар', user: 'Кузнецов И.А.' },
  { id: 'hst-5', clientId: 'c-006', dateTime: '2026-04-10 11:22', section: 'Профиль', field: 'Email', oldValue: 'd.kovalev@old.mail', newValue: 'dkovalev@mailbox.fake', user: 'Ильина Е.В.' },
];
