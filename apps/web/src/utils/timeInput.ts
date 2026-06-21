export function formatTimeInput(value: string, previousValue = ''): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  const previousDigits = previousValue.replace(/\D/g, '');

  if (digits.length >= previousDigits.length) {
    const hours = digits.slice(0, 2);
    const minuteTens = digits[2];

    if (Number(digits[0]) > 2 || (hours.length === 2 && Number(hours) > 24)) {
      return previousValue;
    }
    if (minuteTens !== undefined && Number(minuteTens) > 5) {
      return previousValue;
    }
  }

  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}
