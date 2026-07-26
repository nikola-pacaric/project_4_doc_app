import { describe, expect, it } from 'vitest';

import {
  isFutureLocalDateInput,
  isFutureLocalMonthInput,
  toLocalDateInput,
  toLocalMonthInput,
} from './localCalendarInput';

describe('web local calendar input defaults', () => {
  it('uses local calendar fields for doctor export defaults', () => {
    const value = new Date(2026, 6, 23, 0, 30);

    expect(toLocalDateInput(value)).toBe('2026-07-23');
    expect(toLocalMonthInput(value)).toBe('2026-07');
  });

  it('pads local calendar fields for browser date and month controls', () => {
    const value = new Date(2026, 0, 5, 12);

    expect(toLocalDateInput(value)).toBe('2026-01-05');
    expect(toLocalMonthInput(value)).toBe('2026-01');
  });

  it('rejects only day values after the current local calendar day', () => {
    const now = new Date(2026, 6, 23, 0, 30);

    expect(isFutureLocalDateInput('2026-07-22', now)).toBe(false);
    expect(isFutureLocalDateInput('2026-07-23', now)).toBe(false);
    expect(isFutureLocalDateInput('2026-07-24', now)).toBe(true);
  });

  it('rejects only month values after the current local calendar month', () => {
    const now = new Date(2026, 6, 23, 0, 30);

    expect(isFutureLocalMonthInput('2026-06', now)).toBe(false);
    expect(isFutureLocalMonthInput('2026-07', now)).toBe(false);
    expect(isFutureLocalMonthInput('2026-08', now)).toBe(true);
  });
});
