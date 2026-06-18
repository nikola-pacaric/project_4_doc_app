import { describe, expect, it } from 'vitest';

import {
  hasDailyFormProgress,
  isCompleteDailyForm,
  validateDailyForm,
  type DailyFormDraft,
} from './daily';

const completeDraft: DailyFormDraft = {
  wakeTime: '07:15',
  sleepDuration: '07:30',
  appetite: 'usual',
  waterMl: 1800,
  hasOtherFluids: true,
  otherFluids: 'One coffee',
  hadPhysicalActivity: true,
  activityNotes: '30 minute walk',
  stressLevel: 2,
  dayDescription: 'A normal work day',
  tookMedicationOutsideChronicTherapy: false,
  medicationOutsideChronicTherapy: 'None',
  hadMenstruation: false,
  menstruationNotes: 'No menstruation today',
  energyLevel: 2,
  hadNaps: false,
  naps: 'No naps',
  hasAdditionalNotes: true,
  notes: 'Nothing else to add',
};

describe('daily form validation', () => {
  it('detects partial progress without treating empty defaults as data', () => {
    expect(hasDailyFormProgress({ notes: '', activityNotes: '' })).toBe(false);
    expect(hasDailyFormProgress({ wakeTime: '07:00' })).toBe(true);
    expect(hasDailyFormProgress({ hadNaps: false })).toBe(true);
  });

  it('accepts a complete form', () => {
    expect(isCompleteDailyForm(completeDraft, true)).toBe(true);
  });

  it('requires every common daily response', () => {
    const result = validateDailyForm(
      { ...completeDraft, hasAdditionalNotes: undefined, waterMl: undefined },
      false,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toMatchObject({
      hasAdditionalNotes: 'required',
      waterMl: 'required',
    });
  });

  it('requires menstruation only for a recorded female sex', () => {
    const draft = { ...completeDraft, hadMenstruation: undefined, menstruationNotes: '' };

    expect(validateDailyForm(draft, true).errors.hadMenstruation).toBe('required');
    expect(validateDailyForm(draft, false).errors.hadMenstruation).toBeUndefined();
  });

  it('requires conditional details only after a yes response', () => {
    expect(
      validateDailyForm({ ...completeDraft, hasOtherFluids: true, otherFluids: '' }, false).errors
        .otherFluids,
    ).toBe('required');
    expect(
      validateDailyForm({ ...completeDraft, hasOtherFluids: false, otherFluids: '' }, false).errors
        .otherFluids,
    ).toBeUndefined();
  });

  it('rejects invalid time, water, and scale values', () => {
    const result = validateDailyForm(
      {
        ...completeDraft,
        wakeTime: '25:10',
        sleepDuration: '07:15',
        waterMl: -1,
        stressLevel: 4 as 3,
      },
      false,
    );

    expect(result.errors).toMatchObject({
      wakeTime: 'invalid',
      sleepDuration: 'invalid',
      waterMl: 'invalid',
      stressLevel: 'required',
    });
  });
});
