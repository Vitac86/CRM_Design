import type { ComponentType } from 'react';
import { ClockIcon, FileIcon, ShieldIcon, UsersIcon } from '../components/ui/icons';

export interface DashboardMetric {
  id: string;
  icon: ComponentType<{ className?: string }>;
  value: number;
  label: string;
  trendLabel: string;
  trendType: 'up' | 'down';
}

export interface SubjectChange {
  id: string;
  subject: string;
  change: string;
}

export interface DashboardRequest {
  id: string;
  requestNumber: string;
  status: 'Новая' | 'В работе' | 'Требует уточнения' | 'Исполнена';
  date: string;
}

export const dashboardMetrics: DashboardMetric[] = [
  {
    id: 'metric-01',
    icon: UsersIcon,
    value: 17,
    label: 'новых субъектов',
    trendLabel: '+6.2%',
    trendType: 'up',
  },
  {
    id: 'metric-02',
    icon: ShieldIcon,
    value: 43,
    label: 'очередь комплаенса',
    trendLabel: '+4.1%',
    trendType: 'up',
  },
  {
    id: 'metric-03',
    icon: FileIcon,
    value: 24,
    label: 'новые поручения',
    trendLabel: '+8.7%',
    trendType: 'up',
  },
  {
    id: 'metric-04',
    icon: ClockIcon,
    value: 12,
    label: 'задач просрочено',
    trendLabel: '-2.4%',
    trendType: 'down',
  },
];

export const subjectChanges: SubjectChange[] = [
  {
    id: 'change-01',
    subject: 'ООО «Альфа Капитал»',
    change: 'Обновлён риск-профиль и добавлен новый контакт комплаенса',
  },
  {
    id: 'change-02',
    subject: 'ИП Петров А.А.',
    change: 'Загружен обновлённый пакет документов по идентификации',
  },
  {
    id: 'change-03',
    subject: 'АО «Северный Портфель»',
    change: 'Изменён статус проверки бенефициаров на «На проверке»',
  },
  {
    id: 'change-04',
    subject: 'ООО «Бета Трейд»',
    change: 'В карточке субъекта добавлен новый банковский счёт',
  },
];

export const latestRequests: DashboardRequest[] = [
  {
    id: 'req-01',
    requestNumber: 'REQ-2026-0418',
    status: 'Новая',
    date: '21.04.2026',
  },
  {
    id: 'req-02',
    requestNumber: 'REQ-2026-0411',
    status: 'В работе',
    date: '21.04.2026',
  },
  {
    id: 'req-03',
    requestNumber: 'REQ-2026-0398',
    status: 'Требует уточнения',
    date: '20.04.2026',
  },
  {
    id: 'req-04',
    requestNumber: 'REQ-2026-0374',
    status: 'Исполнена',
    date: '20.04.2026',
  },
];
