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
  tookChronicTherapy: false,
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

  it('requires a chronic-therapy answer only when therapy exists in baseline', () => {
    const unanswered = { ...completeDraft, tookChronicTherapy: undefined };

    expect(validateDailyForm(unanswered, false, true).errors.tookChronicTherapy).toBe('required');
    expect(validateDailyForm(unanswered, false, false).errors.tookChronicTherapy).toBeUndefined();
    expect(
      validateDailyForm({ ...completeDraft, tookChronicTherapy: true }, false, false).errors,
    ).toHaveProperty('tookChronicTherapy', 'invalid');
  });

  it('does not require inline medication text because the Medication form is separate', () => {
    const result = validateDailyForm(
      {
        ...completeDraft,
        tookMedicationOutsideChronicTherapy: true,
        medicationOutsideChronicTherapy: '',
      },
      false,
      true,
    );

    expect(result.errors.medicationOutsideChronicTherapy).toBeUndefined();
  });

  it('uses the exercise panel instead of requiring activity notes', () => {
    const result = validateDailyForm({ ...completeDraft, activityNotes: '' }, false);

    expect(result.errors.activityNotes).toBeUndefined();
    expect(result.valid).toBe(true);
  });

  it('rejects invalid time and scale values', () => {
    const result = validateDailyForm(
      {
        ...completeDraft,
        wakeTime: '25:10',
        sleepDuration: '25:15',
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

  it('accepts the configured maximum hour and minute values', () => {
    expect(validateDailyForm({ ...completeDraft, wakeTime: '23:59' }, false).valid).toBe(true);
    expect(validateDailyForm({ ...completeDraft, wakeTime: '24:00' }, false).errors.wakeTime).toBe(
      'invalid',
    );
    expect(validateDailyForm({ ...completeDraft, sleepDuration: '24:59' }, false).valid).toBe(true);
  });
});
