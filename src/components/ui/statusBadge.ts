import type { BadgeVariant } from './Badge';

export const statusBadgeVariantMap: Record<string, BadgeVariant> = {
  'РЕЗИДЕНТ': 'success',
  'НЕ РЕЗИДЕНТ': 'neutral',
  'ПРОЙДЕН': 'success',
  'НА ПРОВЕРКЕ': 'warning',
  'НА ДОРАБОТКЕ': 'orange',
  'БАН': 'danger',
  'ДЕЙСТВУЮЩИЙ': 'success',
  'НЕ ДЕЙСТВУЮЩИЙ': 'neutral',
  'ОЖИДАЕТ': 'warning',
  'ПРИНЯТО': 'info',
  'ОТКЛОНЕНО': 'danger',
  'ДОСТАВЛЕНО': 'purple',
  'НЕ ДОСТАВЛЕНО': 'orange',
};
