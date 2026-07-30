import { describe, expect, it } from 'vitest';

import { isWeightReminderDue } from './weightReminder';

const now = Date.parse('2026-07-29T10:00:00.000Z');

describe('weight reminder due state', () => {
  it.each([null, undefined, '', 'not-a-date'])('treats %s as not due', (value) => {
    expect(isWeightReminderDue(value, now)).toBe(false);
  });

  it('is not due before the saved reminder instant', () => {
    expect(isWeightReminderDue('2026-07-29T10:00:00.001Z', now)).toBe(false);
  });

  it('is due at and after the saved reminder instant', () => {
    expect(isWeightReminderDue('2026-07-29T10:00:00.000Z', now)).toBe(true);
    expect(isWeightReminderDue('2026-07-28T10:00:00.000Z', now)).toBe(true);
  });
});
