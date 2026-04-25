import type { BadgeVariant } from './Badge';

const normalizeStatusKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const buildMap = (entries: Array<[string, BadgeVariant]>): Record<string, BadgeVariant> =>
  Object.fromEntries(entries.map(([key, variant]) => [normalizeStatusKey(key), variant]));

const statusVariantMap: Record<string, BadgeVariant> = buildMap([
  ['Резидент', 'neutral'],
  ['Не резидент', 'neutral'],
  ['Резидент РФ', 'neutral'],
  ['Нерезидент', 'neutral'],
  ['Юр. лицо', 'neutral'],
  ['Физ. лицо', 'neutral'],
  ['ИП', 'neutral'],

  ['Активный клиент', 'success'],
  ['На комплаенсе', 'info'],
  ['Данные заполнены', 'neutral'],
  ['Пройден', 'success'],
  ['На проверке', 'info'],
  ['На доработке', 'warning'],
  ['Заблокирован', 'danger'],

  ['Действующий', 'success'],
  ['Не действующий', 'neutral'],
  ['Ожидает', 'warning'],
  ['Принято', 'info'],
  ['Отклонено', 'danger'],
  ['Доставлен', 'neutral'],
  ['Доставлено', 'neutral'],
  ['Не доставлено', 'danger'],
  ['Ошибка', 'danger'],

  ['Да', 'success'],
  ['Нет', 'neutral'],

  ['Квалифицированный', 'brand'],
  ['Неквалифицированный', 'neutral'],
  ['Квалифицированный инвестор', 'brand'],
  ['Неквалифицированный инвестор', 'neutral'],

  ['КОУР', 'danger'],
  ['КПУР', 'orange'],
  ['КСУР', 'warning'],
  ['КНУР', 'success'],
  ['Риск: Низкий', 'success'],
  ['Риск: Средний', 'warning'],
  ['Риск: Повышенный', 'orange'],
  ['Риск: Высокий', 'danger'],

  ['Открыт', 'success'],
  ['Закрыт', 'neutral'],
]);

export const statusBadgeVariantMap: Record<string, BadgeVariant> = statusVariantMap;

export const getStatusBadgeVariant = (value: string, fallback: BadgeVariant = 'neutral'): BadgeVariant => {
  if (!value) {
    return fallback;
  }

  return statusVariantMap[normalizeStatusKey(value)] ?? fallback;
};
