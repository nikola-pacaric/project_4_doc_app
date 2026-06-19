import { describe, expect, it } from 'vitest';

import {
  isCompleteMedicationDraft,
  normalizeMedicationDateTime,
  validateMedication,
  type MedicationDraft,
} from './medications';

const completeDraft: MedicationDraft = {
  name: 'Vitamin D',
  dose: '1000 IU',
  takenAt: '2026-06-19 12:30',
  reason: 'Daily health maintenance',
  isChronicTherapy: true,
};

describe('medication validation', () => {
  it('accepts a complete medication entry', () => {
    expect(validateMedication(completeDraft)).toEqual({ valid: true, errors: {} });
    expect(isCompleteMedicationDraft(completeDraft)).toBe(true);
  });

  it('requires the medication, dose, time, and chronic-therapy answer', () => {
    expect(validateMedication({}).errors).toEqual({
      name: 'required',
      dose: 'required',
      takenAt: 'required',
      isChronicTherapy: 'required',
    });
  });

  it('rejects an invalid medication timestamp', () => {
    expect(
      validateMedication({ ...completeDraft, takenAt: '2026-02-30 12:30' }).errors.takenAt,
    ).toBe('invalid');
    expect(normalizeMedicationDateTime('not-a-date')).toBeNull();
  });

  it('keeps the reason optional and accepts a false chronic-therapy answer', () => {
    expect(
      validateMedication({ ...completeDraft, reason: undefined, isChronicTherapy: false }).valid,
    ).toBe(true);
  });
});
