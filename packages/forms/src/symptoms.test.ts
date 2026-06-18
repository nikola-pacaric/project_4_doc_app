import { describe, expect, it } from 'vitest';

import { validateSymptom, validateSymptoms, type SymptomDraft } from './symptoms';

const completeDraft: SymptomDraft = {
  type: 'bloating',
  startedAt: '2026-06-18 08:30',
  endedAt: '2026-06-18 09:15',
  intensity: 2,
  modifyingFactors: 'Improved after a walk',
  wokeFromSleep: false,
};

describe('symptom validation', () => {
  it('accepts a complete symptom occurrence', () => {
    expect(validateSymptom(completeDraft)).toEqual({ valid: true, errors: {} });
  });

  it('requires one or more selected symptoms and their core details', () => {
    expect(validateSymptoms([])).toBe(false);
    expect(validateSymptom({ type: 'nausea' }).errors).toEqual({
      intensity: 'required',
      wokeFromSleep: 'required',
      startedAt: 'required',
    });
  });

  it('requires a custom name for the other option', () => {
    expect(
      validateSymptom({ ...completeDraft, type: 'other', customType: '' }).errors.customType,
    ).toBe('required');
  });

  it('allows an ongoing symptom without an end time', () => {
    expect(validateSymptom({ ...completeDraft, endedAt: '' }).valid).toBe(true);
  });

  it('rejects invalid timestamps and an end before the start', () => {
    expect(validateSymptom({ ...completeDraft, startedAt: 'not-a-date' }).errors.startedAt).toBe(
      'invalid',
    );
    expect(validateSymptom({ ...completeDraft, endedAt: '2026-06-18 08:00' }).errors.endedAt).toBe(
      'before_start',
    );
  });

  it('requires structured pain details only for pain', () => {
    const painResult = validateSymptom({ ...completeDraft, type: 'pain' });
    expect(painResult.errors).toMatchObject({
      painLocation: 'required',
      painRadiates: 'required',
      painDescription: 'required',
    });
    expect(validateSymptom({ ...completeDraft, type: 'gas' }).valid).toBe(true);
  });

  it('requires custom pain details and a radiation target when applicable', () => {
    const result = validateSymptom({
      ...completeDraft,
      type: 'pain',
      painLocation: 'other',
      painRadiates: true,
      painDescription: 'other',
    });

    expect(result.errors).toMatchObject({
      painLocationCustom: 'required',
      painRadiation: 'required',
      painDescriptionCustom: 'required',
    });
  });
});
