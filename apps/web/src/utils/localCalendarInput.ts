import { researchCalendarDay, researchCalendarMonth } from '@project4/contracts';

export function toLocalDateInput(value: Date): string {
  return researchCalendarDay(value);
}

export function toLocalMonthInput(value: Date): string {
  return researchCalendarMonth(value);
}

export function isNormalizedLocalDateInput(value: string): boolean {
  if (!/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isNormalizedLocalMonthInput(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function isFutureLocalDateInput(value: string, now: Date = new Date()): boolean {
  return value > toLocalDateInput(now);
}

export function isFutureLocalMonthInput(value: string, now: Date = new Date()): boolean {
  return value > toLocalMonthInput(now);
}
