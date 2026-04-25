const E164_MAX_DIGITS = 15;
const RUSSIAN_PHONE_DIGITS = 11;
const RUSSIAN_NATIONAL_DIGITS = 10;

export const getPhoneDigits = (value: string): string => value.replace(/\D/g, '');

const hasLeadingPlus = (value: string): boolean => /^\+/.test(value.trim());

const normalizeRussianPhone = (digits: string): string | null => {
  if (digits.length === RUSSIAN_NATIONAL_DIGITS) {
    return `+7${digits}`;
  }

  if (digits.length === RUSSIAN_PHONE_DIGITS && (digits.startsWith('8') || digits.startsWith('7'))) {
    return `+7${digits.slice(1)}`;
  }

  return null;
};

export const sanitizePhoneEditingValue = (value: string): string => {
  const cleaned = value.trimStart().replace(/[^\d+\s()-]/g, '');
  let sanitized = '';
  let hasPlus = false;

  for (const char of cleaned) {
    if (char === '+') {
      if (!hasPlus && sanitized.length === 0) {
        sanitized += '+';
        hasPlus = true;
      }
      continue;
    }

    sanitized += char;
  }

  return sanitized;
};

export const normalizePhoneForStorage = (value: string): string => {
  const sanitized = sanitizePhoneEditingValue(value).trim();
  if (!sanitized || sanitized === '+') {
    return '';
  }

  const digits = getPhoneDigits(sanitized);
  if (!digits) {
    return '';
  }

  if (hasLeadingPlus(sanitized)) {
    return `+${digits.slice(0, E164_MAX_DIGITS)}`;
  }

  const normalizedRussianPhone = normalizeRussianPhone(digits);
  if (normalizedRussianPhone) {
    return normalizedRussianPhone;
  }

  return `+${digits.slice(0, E164_MAX_DIGITS)}`;
};

// Backward-compatible alias used in other forms/pages.
export const normalizePhoneInput = (value: string): string => normalizePhoneForStorage(value);

export const isRussianPhone = (value: string): boolean => {
  const normalized = normalizePhoneForStorage(value);
  return normalized.startsWith('+7');
};

const detectInternationalPrefixLength = (digits: string): number => {
  if (digits.length <= 1) {
    return digits.length;
  }

  const firstDigit = digits[0];
  if (firstDigit === '1') {
    return 1;
  }

  if (firstDigit === '2' || firstDigit === '3' || firstDigit === '9') {
    return Math.min(3, digits.length);
  }

  return Math.min(2, digits.length);
};

export const formatPhoneDisplay = (value: string): string => {
  const normalized = normalizePhoneForStorage(value);
  if (!normalized) {
    return '';
  }

  if (!normalized.startsWith('+')) {
    return normalized;
  }

  if (normalized.startsWith('+7') && normalized.length === RUSSIAN_PHONE_DIGITS + 1) {
    const domestic = normalized.slice(2);
    const part1 = domestic.slice(0, 3);
    const part2 = domestic.slice(3, 6);
    const part3 = domestic.slice(6, 8);
    const part4 = domestic.slice(8, 10);
    return `+7 (${part1}) ${part2}-${part3}-${part4}`;
  }

  const digits = normalized.slice(1);
  const prefixLength = detectInternationalPrefixLength(digits);
  const countryCode = digits.slice(0, prefixLength);
  const subscriber = digits.slice(prefixLength);
  return subscriber ? `+${countryCode} ${subscriber}` : `+${countryCode}`;
};

export const validatePhone = (value: string): { valid: boolean; message?: string } => {
  const normalized = normalizePhoneForStorage(value);
  if (!normalized) {
    return { valid: true };
  }

  const digitsCount = getPhoneDigits(value).length;
  if (digitsCount < 8) {
    return { valid: false, message: 'Укажите не менее 8 цифр в номере телефона.' };
  }
  if (digitsCount > E164_MAX_DIGITS) {
    return { valid: false, message: 'Телефон должен содержать не более 15 цифр.' };
  }

  if (isRussianPhone(value) && normalized.slice(1).length !== RUSSIAN_PHONE_DIGITS) {
    return { valid: false, message: 'Российский номер должен содержать 11 цифр в формате +7XXXXXXXXXX.' };
  }

  return { valid: true };
};

export const isRussianPhoneComplete = (value: string): boolean => {
  const normalized = normalizePhoneForStorage(value);
  return normalized.startsWith('+7') && normalized.slice(1).length === RUSSIAN_PHONE_DIGITS;
};
