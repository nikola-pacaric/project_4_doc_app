import { describe, expect, it } from 'vitest';

import {
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
