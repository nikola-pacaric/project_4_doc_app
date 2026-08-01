import { describe, expect, it } from 'vitest';

import {
  addLocalDays,
  formatTimeInput,
  isValidTrackedDay,
  localDayRange,
  parseLocalDateInput,
  parseLocalDateTime,
  startOfWeekMonday,
  toDeviceCalendarDateInput,
  toLocalDateInput,
  toLocalMonthInput,
  toLocalTimeInput,
  weekDayKeys,
} from './dateTime';

describe('mobile date and time helpers', () => {
  it('formats Europe/Belgrade values for editable inputs', () => {
    const value = new Date('2026-06-18T07:07:00.000Z');

    expect(toLocalDateInput(value)).toBe('2026-06-18');
    expect(toLocalMonthInput(value)).toBe('2026-06');
    expect(toLocalTimeInput(value)).toBe('09:07');
  });

  it('changes the tracked date at Belgrade midnight', () => {
    expect(toLocalDateInput(new Date('2026-01-01T22:59:59.000Z'))).toBe('2026-01-01');
    expect(toLocalDateInput(new Date('2026-01-01T23:00:00.000Z'))).toBe('2026-01-02');
  });

  it('keeps time input numeric and inserts the separator after two digits', () => {
    expect(formatTimeInput('1a2b3')).toBe('12:3');
    expect(formatTimeInput('12:34')).toBe('12:34');
    expect(formatTimeInput('123456')).toBe('12:34');
  });

  it('rejects hours above 24 and minutes above 59 while typing', () => {
    expect(formatTimeInput('80:80')).toBe('');
    expect(formatTimeInput('25', '2')).toBe('2');
    expect(formatTimeInput('24:6', '24')).toBe('24');
    expect(formatTimeInput('24:59', '24:5')).toBe('24:59');
    expect(formatTimeInput('24', '2', 23)).toBe('2');
  });

  it('rejects invalid calendar and time values', () => {
    expect(parseLocalDateTime('2026-02-31', '09:00')).toBeNull();
    expect(parseLocalDateTime('2026-06-18', '24:00')).toBeNull();
    expect(parseLocalDateTime('18-06-2026', '09:00')).toBeNull();
    expect(parseLocalDateTime('2026-03-29', '02:30')).toBeNull();
  });

  it('returns deterministic ISO timestamps for normal and repeated Belgrade times', () => {
    expect(parseLocalDateTime('2026-06-18', '09:07')).toBe('2026-06-18T07:07:00.000Z');
    expect(parseLocalDateTime('2026-10-25', '02:30')).toBe('2026-10-25T00:30:00.000Z');
  });

  it('validates tracked calendar days without allowing future dates', () => {
    expect(isValidTrackedDay('2026-06-21', '2026-06-21')).toBe(true);
    expect(isValidTrackedDay('2026-02-31', '2026-06-21')).toBe(false);
    expect(isValidTrackedDay('2026-06-22', '2026-06-21')).toBe(false);
  });

  it('creates Europe/Belgrade start, end, and midday timestamps for a tracked day', () => {
    const range = localDayRange('2026-06-21');

    expect(range).toEqual({
      start: '2026-06-20T22:00:00.000Z',
      end: '2026-06-21T22:00:00.000Z',
      occurredAt: '2026-06-21T10:00:00.000Z',
    });
  });

  it('builds Monday-start week day keys for a local date', () => {
    // 2026-07-15 is a Wednesday
    const weekStart = startOfWeekMonday(parseLocalDateInput('2026-07-15'));
    expect(toDeviceCalendarDateInput(weekStart)).toBe('2026-07-13');
    expect(weekDayKeys(weekStart)).toEqual([
      '2026-07-13',
      '2026-07-14',
      '2026-07-15',
      '2026-07-16',
      '2026-07-17',
      '2026-07-18',
      '2026-07-19',
    ]);
    expect(toDeviceCalendarDateInput(addLocalDays(weekStart, 7))).toBe('2026-07-20');
  });
});
