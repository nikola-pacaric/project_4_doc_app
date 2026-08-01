import { describe, expect, it } from 'vitest';

import {
  addResearchCalendarDays,
  researchCalendarDateTime,
  researchCalendarDay,
  researchCalendarDayRange,
  researchCalendarInstant,
} from './researchCalendarCore';

describe('Europe/Belgrade research calendar', () => {
  it('changes day at Belgrade midnight, independent of the device timezone', () => {
    expect(researchCalendarDay(new Date('2026-01-01T22:59:59Z'))).toBe('2026-01-01');
    expect(researchCalendarDay(new Date('2026-01-01T23:00:00Z'))).toBe('2026-01-02');
    expect(researchCalendarDateTime(new Date('2026-07-01T22:30:00Z'))).toBe(
      '2026-07-02T00:30',
    );
  });

  it('creates a 23-hour day for the spring DST transition', () => {
    const range = researchCalendarDayRange('2026-03-29');
    expect(range).toEqual({
      start: '2026-03-28T23:00:00.000Z',
      end: '2026-03-29T22:00:00.000Z',
      occurredAt: '2026-03-29T10:00:00.000Z',
    });
    expect(Date.parse(range.end) - Date.parse(range.start)).toBe(23 * 3_600_000);
  });

  it('creates a 25-hour day for the autumn DST transition', () => {
    const range = researchCalendarDayRange('2026-10-25');
    expect(range).toEqual({
      start: '2026-10-24T22:00:00.000Z',
      end: '2026-10-25T23:00:00.000Z',
      occurredAt: '2026-10-25T11:00:00.000Z',
    });
    expect(Date.parse(range.end) - Date.parse(range.start)).toBe(25 * 3_600_000);
  });

  it('rejects a skipped time and resolves a repeated time deterministically', () => {
    expect(researchCalendarInstant('2026-03-29', '02:30')).toBeNull();
    expect(researchCalendarInstant('2026-10-25', '02:30')).toBe('2026-10-25T00:30:00.000Z');
    expect(addResearchCalendarDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});
