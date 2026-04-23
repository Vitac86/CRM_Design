import type { ComponentType } from 'react';
import { ClockIcon, FileIcon, ShieldIcon, UsersIcon } from '../components/ui/icons';

export interface DashboardMetric {
  id: string;
  icon: ComponentType<{ className?: string }>;
  value: number;
  label: string;
  trendLabel: string;
  trendType: 'up' | 'down';
  to?: string;
}

export interface SubjectChange {
  id: string;
  subject: string;
  change: string;
}

export const dashboardMetrics: DashboardMetric[] = [
  {
    id: 'metric-01',
    icon: UsersIcon,
    value: 17,
    label: 'новых субъектов',
    trendLabel: '+6.2%',
    trendType: 'up',
    to: '/subjects?subjectStatus=Регистрация',
  },
  {
    id: 'metric-02',
    icon: ShieldIcon,
    value: 43,
    label: 'очередь комплаенса',
    trendLabel: '+4.1%',
    trendType: 'up',
    to: '/compliance?complianceStatus=НА%20ПРОВЕРКЕ',
  },
  {
    id: 'metric-03',
    icon: FileIcon,
    value: 24,
    label: 'новые поручения',
    trendLabel: '+8.7%',
    trendType: 'up',
    to: '/requests?status=Ожидает',
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
