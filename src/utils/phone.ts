const E164_MAX_DIGITS = 15;
const RUSSIAN_PHONE_DIGITS = 11;

export const getPhoneDigits = (value: string): string => value.replace(/\D/g, '').slice(0, E164_MAX_DIGITS);

const hasLeadingPlus = (value: string): boolean => /^\s*\+/.test(value);

const normalizeRussianPhone = (digits: string): string => {
  if (!digits) {
    return '';
  }

  if (digits.length === 10) {
    return `+7${digits}`;
  }

  if (digits.startsWith('8')) {
    return `+7${digits.slice(1, RUSSIAN_PHONE_DIGITS)}`;
  }

  if (digits.startsWith('7')) {
    return `+${digits.slice(0, RUSSIAN_PHONE_DIGITS)}`;
  }

  if (digits.startsWith('9')) {
    return `+7${digits.slice(0, 10)}`;
  }

  return `+7${digits.slice(0, 10)}`;
};

export const normalizePhoneInput = (value: string): string => {
  const digits = getPhoneDigits(value);

  if (!digits) {
    return '';
  }

  if (hasLeadingPlus(value)) {
    if (digits.startsWith('7')) {
      return `+${digits.slice(0, RUSSIAN_PHONE_DIGITS)}`;
    }
    return `+${digits.slice(0, E164_MAX_DIGITS)}`;
  }

  return normalizeRussianPhone(digits);
};

export const isRussianPhone = (value: string): boolean => normalizePhoneInput(value).startsWith('+7');

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
  const normalized = normalizePhoneInput(value);
  if (!normalized) {
    return '';
  }

  if (!isRussianPhone(normalized)) {
    const digits = normalized.slice(1);
    const prefixLength = detectInternationalPrefixLength(digits);
    const countryCode = digits.slice(0, prefixLength);
    const subscriber = digits.slice(prefixLength);
    return subscriber ? `+${countryCode} ${subscriber}` : `+${countryCode}`;
  }

  const domestic = normalized.slice(2, 12);
  const part1 = domestic.slice(0, 3);
  const part2 = domestic.slice(3, 6);
  const part3 = domestic.slice(6, 8);
  const part4 = domestic.slice(8, 10);

  let formatted = '+7';
  if (part1) {
    formatted += ` (${part1}`;
  }
  if (domestic.length >= 3) {
    formatted += ')';
  }
  if (part2) {
    formatted += ` ${part2}`;
  }
  if (part3) {
    formatted += `-${part3}`;
  }
  if (part4) {
    formatted += `-${part4}`;
  }
  return formatted;
};

export const validatePhone = (value: string): { valid: boolean; message?: string } => {
  const normalized = normalizePhoneInput(value);
  if (!normalized) {
    return { valid: true };
  }

  const digitsCount = normalized.slice(1).length;
  if (digitsCount < 8) {
    return { valid: false, message: 'Укажите не менее 8 цифр в номере телефона.' };
  }
  if (digitsCount > E164_MAX_DIGITS) {
    return { valid: false, message: 'Телефон должен содержать не более 15 цифр.' };
  }
  if (isRussianPhone(normalized) && digitsCount !== RUSSIAN_PHONE_DIGITS) {
    return { valid: false, message: 'Российский номер должен содержать 11 цифр в формате +7XXXXXXXXXX.' };
  }

  return { valid: true };
};

export const isRussianPhoneComplete = (value: string): boolean => {
  const normalized = normalizePhoneInput(value);
  return isRussianPhone(normalized) && normalized.slice(1).length === RUSSIAN_PHONE_DIGITS;
};
