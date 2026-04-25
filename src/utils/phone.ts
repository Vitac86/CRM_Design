const normalizeRussianPhoneDigits = (value: string): string => {
  const digitsOnly = value.replace(/\D/g, '');

  if (!digitsOnly) {
    return '';
  }

  if (digitsOnly.length === 10 && digitsOnly.startsWith('9')) {
    return `7${digitsOnly}`;
  }

  if (digitsOnly.length >= 11) {
    if (digitsOnly.startsWith('8')) {
      return `7${digitsOnly.slice(1, 11)}`;
    }
    if (digitsOnly.startsWith('7')) {
      return digitsOnly.slice(0, 11);
    }
    if (digitsOnly.startsWith('9')) {
      return `7${digitsOnly.slice(0, 10)}`;
    }
    return `7${digitsOnly.slice(-10)}`;
  }

  if (digitsOnly[0] === '8') {
    return `7${digitsOnly.slice(1)}`;
  }

  if (digitsOnly[0] === '9') {
    return `7${digitsOnly}`;
  }

  return digitsOnly;
};

export const normalizePhoneInput = (value: string): string => {
  const normalizedDigits = normalizeRussianPhoneDigits(value);

  if (!normalizedDigits) {
    return '';
  }

  const domestic = normalizedDigits.startsWith('7') ? normalizedDigits.slice(1, 11) : normalizedDigits.slice(0, 10);
  const part1 = domestic.slice(0, 3);
  const part2 = domestic.slice(3, 6);
  const part3 = domestic.slice(6, 8);
  const part4 = domestic.slice(8, 10);

  let formatted = '+7';
  if (part1) formatted += ` (${part1}`;
  if (domestic.length >= 3) formatted += ')';
  if (part2) formatted += ` ${part2}`;
  if (part3) formatted += `-${part3}`;
  if (part4) formatted += `-${part4}`;

  return formatted;
};

export const isRussianPhoneComplete = (value: string): boolean => {
  const normalizedDigits = normalizeRussianPhoneDigits(value);
  return normalizedDigits.length === 11 && normalizedDigits.startsWith('7');
};
