import { describe, expect, it } from 'vitest';

import {
  isFutureLocalDateInput,
  isFutureLocalMonthInput,
  isNormalizedLocalDateInput,
  isNormalizedLocalMonthInput,
  toLocalDateInput,
  toLocalMonthInput,
} from './localCalendarInput';

describe('web local calendar input defaults', () => {
  it('uses Europe/Belgrade calendar fields for doctor export defaults', () => {
    const value = new Date('2026-07-22T22:30:00.000Z');

    expect(toLocalDateInput(value)).toBe('2026-07-23');
    expect(toLocalMonthInput(value)).toBe('2026-07');
  });

  it('pads research calendar fields for browser date and month controls', () => {
    const value = new Date('2026-01-05T11:00:00.000Z');

    expect(toLocalDateInput(value)).toBe('2026-01-05');
    expect(toLocalMonthInput(value)).toBe('2026-01');
  });

  it('accepts only non-empty normalized calendar values', () => {
    expect(isNormalizedLocalDateInput('2026-07-23')).toBe(true);
    expect(isNormalizedLocalDateInput('')).toBe(false);
    expect(isNormalizedLocalDateInput('2026-7-23')).toBe(false);
    expect(isNormalizedLocalDateInput('2026-02-31')).toBe(false);

    expect(isNormalizedLocalMonthInput('2026-07')).toBe(true);
    expect(isNormalizedLocalMonthInput('')).toBe(false);
    expect(isNormalizedLocalMonthInput('2026-7')).toBe(false);
    expect(isNormalizedLocalMonthInput('2026-13')).toBe(false);
  });

  it('rejects only day values after the current research calendar day', () => {
    const now = new Date('2026-07-22T22:30:00.000Z');

    expect(isFutureLocalDateInput('2026-07-22', now)).toBe(false);
    expect(isFutureLocalDateInput('2026-07-23', now)).toBe(false);
    expect(isFutureLocalDateInput('2026-07-24', now)).toBe(true);
  });

  it('rejects only month values after the current research calendar month', () => {
    const now = new Date('2026-07-22T22:30:00.000Z');

    expect(isFutureLocalMonthInput('2026-06', now)).toBe(false);
    expect(isFutureLocalMonthInput('2026-07', now)).toBe(false);
    expect(isFutureLocalMonthInput('2026-08', now)).toBe(true);
  });
});
