import { exerciseIntensities, type ExerciseIntensity } from '@project4/contracts';

export type { ExerciseIntensity } from '@project4/contracts';

export interface ExerciseDraft {
  entryId?: string;
  activity?: string;
  durationMinutes?: number;
  intensity?: ExerciseIntensity;
  occurredAt?: string;
  notes?: string;
}

export type ExerciseField = keyof Omit<ExerciseDraft, 'entryId'>;
export type CompleteExerciseDraft = ExerciseDraft &
  Required<Omit<ExerciseDraft, 'entryId' | 'notes'>>;

export interface ExerciseValidationResult {
  valid: boolean;
  errors: Partial<Record<ExerciseField, 'required' | 'invalid'>>;
}

export const exerciseDraftDefaults: ExerciseDraft = { notes: '' };

export function normalizeExerciseDateTime(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  const localMatch = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(trimmed);

  if (localMatch) {
    const [, yearText, monthText, dayText, hourText, minuteText] = localMatch;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);
    const valid =
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day &&
      parsed.getHours() === hour &&
      parsed.getMinutes() === minute;
    return valid ? parsed.toISOString() : null;
  }

  const timestamp = Date.parse(trimmed);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

export function validateExercise(draft: ExerciseDraft): ExerciseValidationResult {
  const errors: ExerciseValidationResult['errors'] = {};

  if (!draft.activity?.trim()) errors.activity = 'required';
  if (draft.durationMinutes === undefined) {
    errors.durationMinutes = 'required';
  } else if (
    !Number.isInteger(draft.durationMinutes) ||
    draft.durationMinutes <= 0 ||
    draft.durationMinutes > 1_440
  ) {
    errors.durationMinutes = 'invalid';
  }
  if (!draft.intensity) {
    errors.intensity = 'required';
  } else if (!exerciseIntensities.includes(draft.intensity)) {
    errors.intensity = 'invalid';
  }
  if (!draft.occurredAt?.trim()) {
    errors.occurredAt = 'required';
  } else if (!normalizeExerciseDateTime(draft.occurredAt)) {
    errors.occurredAt = 'invalid';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function isCompleteExerciseDraft(draft: ExerciseDraft): draft is CompleteExerciseDraft {
  return validateExercise(draft).valid;
}
