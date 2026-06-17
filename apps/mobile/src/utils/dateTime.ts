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
