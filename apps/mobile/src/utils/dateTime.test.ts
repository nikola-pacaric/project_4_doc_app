import { describe, expect, it } from 'vitest';

import {
  formatTimeInput,
  isValidTrackedDay,
  localDayRange,
  parseLocalDateTime,
  toLocalDateInput,
  toLocalTimeInput,
} from './dateTime';

describe('mobile date and time helpers', () => {
  it('formats local values for editable inputs', () => {
    const value = new Date(2026, 5, 18, 9, 7);

    expect(toLocalDateInput(value)).toBe('2026-06-18');
    expect(toLocalTimeInput(value)).toBe('09:07');
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
  });

  it('returns an ISO timestamp for valid local input', () => {
    const result = parseLocalDateTime('2026-06-18', '09:07');

    expect(result).not.toBeNull();
    expect(new Date(result!).getFullYear()).toBe(2026);
    expect(new Date(result!).getMonth()).toBe(5);
    expect(new Date(result!).getDate()).toBe(18);
  });

  it('validates tracked calendar days without allowing future dates', () => {
    expect(isValidTrackedDay('2026-06-21', '2026-06-21')).toBe(true);
    expect(isValidTrackedDay('2026-02-31', '2026-06-21')).toBe(false);
    expect(isValidTrackedDay('2026-06-22', '2026-06-21')).toBe(false);
  });

  it('creates local start, end, and midday timestamps for a tracked day', () => {
    const range = localDayRange('2026-06-21');

    expect(new Date(range.start).getHours()).toBe(0);
    expect(new Date(range.end).getDate()).toBe(22);
    expect(new Date(range.occurredAt).getHours()).toBe(12);
  });
});
