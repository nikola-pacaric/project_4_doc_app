import {
  researchCalendarDay,
  researchCalendarDayRange,
  researchCalendarInstant,
} from '@project4/contracts';
import { researchCalendarMonth, researchCalendarTime } from '@project4/contracts';
import type { Locale } from '@project4/i18n';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toDeviceCalendarDateInput(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function toLocalDateInput(value: Date): string {
  return researchCalendarDay(value);
}

/** Parse YYYY-MM-DD as a local calendar date (noon-safe for formatting). */
export function parseLocalDateInput(day: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return new Date();
  const [, yearText = '', monthText = '', dateText = ''] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const date = Number(dateText);
  const parsed = new Date(year, month - 1, date);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function addLocalDays(value: Date, days: number): Date {
  const next = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

/** Monday-start week containing the given local date. */
export function startOfWeekMonday(value: Date): Date {
  const day = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const weekday = day.getDay(); // 0 Sun … 6 Sat
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addLocalDays(day, offset);
}

export function weekDayKeys(weekStart: Date): string[] {
  return Array.from({ length: 7 }, (_, index) =>
    toDeviceCalendarDateInput(addLocalDays(weekStart, index)),
  );
}

export function toDeviceCalendarMonthInput(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}`;
}

export function toLocalMonthInput(value: Date): string {
  return researchCalendarMonth(value);
}

export function toDeviceCalendarTimeInput(value: Date): string {
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function toLocalTimeInput(value: Date): string {
  return researchCalendarTime(value);
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

export function isValidTrackedDay(day: string, today = researchCalendarDay(new Date())): boolean {
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
  return researchCalendarDayRange(day);
}

export function parseLocalDateTime(dateValue: string, timeValue: string): string | null {
  return researchCalendarInstant(dateValue.trim(), timeValue.trim());
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
