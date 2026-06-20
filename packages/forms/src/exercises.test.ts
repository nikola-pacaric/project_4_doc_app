import { describe, expect, it } from 'vitest';

import {
  isCompleteExerciseDraft,
  normalizeExerciseDateTime,
  validateExercise,
  type ExerciseDraft,
} from './exercises';

const completeDraft: ExerciseDraft = {
  activity: 'Walking',
  durationMinutes: 30,
  intensity: 'light',
  occurredAt: '2026-06-20 18:30',
  notes: 'Evening walk',
};

describe('exercise validation', () => {
  it('accepts a complete exercise entry', () => {
    expect(validateExercise(completeDraft)).toEqual({ valid: true, errors: {} });
    expect(isCompleteExerciseDraft(completeDraft)).toBe(true);
  });

  it('requires activity, duration, intensity, and occurrence time', () => {
    expect(validateExercise({}).errors).toEqual({
      activity: 'required',
      durationMinutes: 'required',
      intensity: 'required',
      occurredAt: 'required',
    });
  });

  it('rejects zero, fractional, and over-day durations', () => {
    expect(validateExercise({ ...completeDraft, durationMinutes: 0 }).errors.durationMinutes).toBe(
      'invalid',
    );
    expect(
      validateExercise({ ...completeDraft, durationMinutes: 10.5 }).errors.durationMinutes,
    ).toBe('invalid');
    expect(
      validateExercise({ ...completeDraft, durationMinutes: 1_441 }).errors.durationMinutes,
    ).toBe('invalid');
  });

  it('rejects invalid timestamps and keeps notes optional', () => {
    expect(
      validateExercise({ ...completeDraft, occurredAt: '2026-02-30 18:30' }).errors.occurredAt,
    ).toBe('invalid');
    expect(normalizeExerciseDateTime('not-a-date')).toBeNull();
    expect(validateExercise({ ...completeDraft, notes: undefined }).valid).toBe(true);
  });
});
