import { describe, expect, it } from 'vitest';

import { toLocalDateInput, toLocalMonthInput } from './localCalendarInput';

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
});
