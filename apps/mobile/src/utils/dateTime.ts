import type { Locale } from '@project4/i18n';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toLocalDateInput(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function toLocalTimeInput(value: Date): string {
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function formatTimeInput(value: string, previousValue = '', maximumHour = 24): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  const previousDigits = previousValue.replace(/\D/g, '');

  if (digits.length >= previousDigits.length) {
    const hours = digits.slice(0, 2);
    const minuteTens = digits[2];

    if (Number(digits[0]) > 2 || (hours.length === 2 && Number(hours) > maximumHour)) {
      return previousValue;
    }
    if (minuteTens !== undefined && Number(minuteTens) > 5) {
      return previousValue;
    }
  }

  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

export function isValidTrackedDay(day: string, today = toLocalDateInput(new Date())): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day > today) return false;
  const [yearText = '', monthText = '', dateText = ''] = day.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const date = Number(dateText);
  const parsed = new Date(year, month - 1, date);
  return (
    parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === date
  );
}

export function localDayRange(day: string): { start: string; end: string; occurredAt: string } {
  const [yearText = '', monthText = '', dateText = ''] = day.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const date = Number(dateText);
  return {
    start: new Date(year, month - 1, date).toISOString(),
    end: new Date(year, month - 1, date + 1).toISOString(),
    occurredAt: new Date(year, month - 1, date, 12).toISOString(),
  };
}

export function parseLocalDateTime(dateValue: string, timeValue: string): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue.trim());
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue.trim());

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const [, yearText, monthText, dayText] = dateMatch;
  const [, hourText, minuteText] = timeMatch;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (month < 1 || month > 12 || hour > 23 || minute > 59) {
    return null;
  }

  const value = new Date(year, month - 1, day, hour, minute, 0, 0);
  const matchesInput =
    value.getFullYear() === year &&
    value.getMonth() === month - 1 &&
    value.getDate() === day &&
    value.getHours() === hour &&
    value.getMinutes() === minute;

  return matchesInput ? value.toISOString() : null;
}

function localeTag(locale: Locale): string {
  return locale === 'sr' ? 'sr-Latn-RS' : 'en-US';
}

export function formatEntryDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export function formatEntryTime(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
