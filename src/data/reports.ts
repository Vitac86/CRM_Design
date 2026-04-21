import type { Report } from './types';

export const reports: Report[] = [
  {
    id: 'rep-001',
    department: 'Мидл-офис',
    fileName: 'MO_positions_2026-04-20_1800.csv',
    sentAt: '2026-04-20 18:05',
    reportType: 'Позиции клиентов',
    deliveryChannel: 'FTP',
    deliveryResult: 'Доставлен'
  },
  {
    id: 'rep-002',
    department: 'Мидл-офис',
    fileName: 'MO_limits_2026-04-21_0900.xlsx',
    sentAt: '2026-04-21 09:02',
    reportType: 'Контроль лимитов',
    deliveryChannel: 'Email',
    deliveryResult: 'Ожидает подтверждения'
  },
  {
    id: 'rep-003',
    department: 'Бэк-офис',
    fileName: 'BO_settlements_2026-04-20_1900.xml',
    sentAt: '2026-04-20 19:01',
    reportType: 'Расчёты T+1',
    deliveryChannel: 'СБИС',
    deliveryResult: 'Доставлен'
  },
  {
    id: 'rep-004',
    department: 'Бэк-офис',
    fileName: 'BO_cashflow_2026-04-21_0800.csv',
    sentAt: '2026-04-21 08:03',
    reportType: 'Движение денежных средств',
    deliveryChannel: 'Диадок',
    deliveryResult: 'Ошибка'
  },
  {
    id: 'rep-005',
    department: 'Депозитарий',
    fileName: 'DEP_corporate_actions_2026-04-20_1730.xlsx',
    sentAt: '2026-04-20 17:36',
    reportType: 'Корпоративные действия',
    deliveryChannel: 'Email',
    deliveryResult: 'Доставлен'
  },
  {
    id: 'rep-006',
    department: 'Депозитарий',
    fileName: 'DEP_positions_2026-04-21_1000.csv',
    sentAt: '2026-04-21 10:04',
    reportType: 'Позиции ДЕПО',
    deliveryChannel: 'FTP',
    deliveryResult: 'Ожидает подтверждения'
  }
];
