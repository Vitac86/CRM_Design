import type { BadgeVariant } from './Badge';

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'muted';

export type StatusSemanticGroup =
  | 'compliance'
  | 'subject'
  | 'request'
  | 'delivery'
  | 'account'
  | 'residency'
  | 'client_type'
  | 'qualification'
  | 'risk'
  | 'activity'
  | 'boolean'
  | 'generic';

export type StatusDescriptor = {
  label: string;
  tone: StatusTone;
  group: StatusSemanticGroup;
  aliases?: string[];
};

const normalizeStatusKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const toneToVariant: Record<StatusTone, BadgeVariant> = {
  neutral: 'neutral',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  brand: 'brand',
  muted: 'neutral',
};

const statusCatalog: StatusDescriptor[] = [
  { label: 'Резидент', tone: 'neutral', group: 'residency', aliases: ['Резидент РФ'] },
  { label: 'Нерезидент', tone: 'neutral', group: 'residency', aliases: ['Не резидент'] },
  { label: 'Юр. лицо', tone: 'neutral', group: 'client_type' },
  { label: 'Физ. лицо', tone: 'neutral', group: 'client_type' },
  { label: 'ИП', tone: 'neutral', group: 'client_type' },

  { label: 'Активный клиент', tone: 'success', group: 'subject' },
  { label: 'Активен', tone: 'success', group: 'activity', aliases: ['Активно', 'Подключён', 'Включён'] },
  { label: 'На комплаенсе', tone: 'info', group: 'subject' },
  { label: 'Данные заполнены', tone: 'neutral', group: 'subject' },
  { label: 'Пройден', tone: 'success', group: 'compliance' },
  { label: 'На проверке', tone: 'info', group: 'compliance' },
  { label: 'На доработке', tone: 'warning', group: 'compliance' },
  { label: 'Заблокирован', tone: 'danger', group: 'compliance' },

  { label: 'Действующий', tone: 'success', group: 'account' },
  { label: 'Не действующий', tone: 'neutral', group: 'account' },
  { label: 'Ожидает', tone: 'warning', group: 'request' },
  { label: 'Принято', tone: 'info', group: 'request' },
  { label: 'Отклонено', tone: 'danger', group: 'request' },
  { label: 'Доставлен', tone: 'neutral', group: 'delivery', aliases: ['Доставлено'] },
  { label: 'Не доставлено', tone: 'danger', group: 'delivery' },
  { label: 'Ошибка', tone: 'danger', group: 'generic' },

  { label: 'Да', tone: 'success', group: 'boolean' },
  { label: 'Нет', tone: 'neutral', group: 'boolean' },

  { label: 'Квалифицированный', tone: 'brand', group: 'qualification', aliases: ['Квалифицированный инвестор'] },
  { label: 'Неквалифицированный', tone: 'neutral', group: 'qualification', aliases: ['Неквалифицированный инвестор'] },

  { label: 'КОУР', tone: 'danger', group: 'risk', aliases: ['Риск: Высокий', 'Высокий', 'Особый'] },
  { label: 'КПУР', tone: 'warning', group: 'risk', aliases: ['Риск: Повышенный', 'Повышенный'] },
  { label: 'КСУР', tone: 'warning', group: 'risk', aliases: ['Риск: Средний', 'Средний', 'Стандартный'] },
  { label: 'КНУР', tone: 'success', group: 'risk', aliases: ['Риск: Низкий', 'Низкий', 'Начальный'] },

  { label: 'Открыт', tone: 'success', group: 'account' },
  { label: 'Закрыт', tone: 'neutral', group: 'account' },
  { label: 'Приостановлен', tone: 'warning', group: 'account' },
  { label: 'На подписании', tone: 'info', group: 'account' },
];

const statusDescriptorMap: Record<string, StatusDescriptor> = Object.fromEntries(
  statusCatalog.flatMap((entry) => {
    const aliases = entry.aliases ?? [];

    return [entry.label, ...aliases].map((key) => [normalizeStatusKey(key), entry] as const);
  }),
);

const statusVariantMap: Record<string, BadgeVariant> = Object.fromEntries(
  Object.entries(statusDescriptorMap).map(([key, descriptor]) => [key, toneToVariant[descriptor.tone]]),
);

export const statusBadgeVariantMap: Record<string, BadgeVariant> = statusVariantMap;

export const getStatusDescriptor = (value: string): StatusDescriptor | undefined => {
  if (!value) {
    return undefined;
  }

  return statusDescriptorMap[normalizeStatusKey(value)];
};

export const getStatusBadgeVariant = (value: string, fallback: BadgeVariant = 'neutral'): BadgeVariant => {
  const descriptor = getStatusDescriptor(value);

  return descriptor ? toneToVariant[descriptor.tone] : fallback;
};

export const getStatusLabel = (value: string): string => {
  const descriptor = getStatusDescriptor(value);

  return descriptor?.label ?? value;
};
