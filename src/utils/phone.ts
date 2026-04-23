export const normalizePhoneInput = (value: string): string => {
  const compactValue = value.replace(/\s+/g, '');
  const digitsOnly = compactValue.replace(/\D/g, '');

  if (!digitsOnly) {
    return compactValue.startsWith('+') ? '+' : '';
  }

  return `+${digitsOnly}`;
};
