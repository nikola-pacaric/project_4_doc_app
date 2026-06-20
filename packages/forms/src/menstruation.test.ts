import { describe, expect, it } from 'vitest';

import {
  isCompleteMenstruationDraft,
  normalizeMenstruationDateTime,
  validateMenstruation,
  type MenstruationDraft,
} from './menstruation';

const completeDraft: MenstruationDraft = {
  flow: 'moderate',
  painLevel: 2,
  occurredAt: '2026-06-20 09:00',
  notes: 'Mild cramps',
};

describe('menstruation validation', () => {
  it('accepts a complete menstruation entry', () => {
    expect(validateMenstruation(completeDraft)).toEqual({ valid: true, errors: {} });
    expect(isCompleteMenstruationDraft(completeDraft)).toBe(true);
  });

  it('requires flow, pain level, and occurrence time', () => {
    expect(validateMenstruation({}).errors).toEqual({
      flow: 'required',
      painLevel: 'required',
      occurredAt: 'required',
    });
  });

  it('rejects pain levels outside the supported scale', () => {
    expect(validateMenstruation({ ...completeDraft, painLevel: 4 as 3 }).errors.painLevel).toBe(
      'invalid',
    );
  });

  it('rejects invalid timestamps and keeps notes optional', () => {
    expect(
      validateMenstruation({ ...completeDraft, occurredAt: '2026-02-30 09:00' }).errors.occurredAt,
    ).toBe('invalid');
    expect(normalizeMenstruationDateTime('not-a-date')).toBeNull();
    expect(validateMenstruation({ ...completeDraft, notes: undefined }).valid).toBe(true);
  });
});
