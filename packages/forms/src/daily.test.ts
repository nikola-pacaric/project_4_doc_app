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
};

describe('daily form validation', () => {
  it('detects partial progress without treating empty defaults as data', () => {
    expect(hasDailyFormProgress({ activityNotes: '' })).toBe(false);
    expect(hasDailyFormProgress({ wakeTime: '07:00' })).toBe(true);
    expect(hasDailyFormProgress({ hadNaps: false })).toBe(true);
  });

  it('accepts a complete form', () => {
    expect(isCompleteDailyForm(completeDraft, true)).toBe(true);
  });

  it('requires every common daily response', () => {
    const result = validateDailyForm({ ...completeDraft, appetite: undefined }, false);

    expect(result.valid).toBe(false);
    expect(result.errors).toMatchObject({
      appetite: 'required',
    });
  });

  it('requires menstruation only for a recorded female sex', () => {
    const draft = { ...completeDraft, hadMenstruation: undefined, menstruationNotes: '' };

    expect(validateDailyForm(draft, true).errors.hadMenstruation).toBe('required');
    expect(validateDailyForm(draft, false).errors.hadMenstruation).toBeUndefined();
  });

  it('requires conditional details only after a yes response', () => {
    expect(
      validateDailyForm({ ...completeDraft, hadNaps: true, naps: '' }, false).errors.naps,
    ).toBe('required');
  });

  it('rejects invalid time and scale values', () => {
    const result = validateDailyForm(
      {
        ...completeDraft,
        wakeTime: '25:10',
        sleepDuration: '07:15',
        stressLevel: 4 as 3,
      },
      false,
    );

    expect(result.errors).toMatchObject({
      wakeTime: 'invalid',
      sleepDuration: 'invalid',
      stressLevel: 'required',
    });
  });
});
