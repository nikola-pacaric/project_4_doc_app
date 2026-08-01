import {
  exerciseIntensities,
  normalizeResearchCalendarDateTime,
  type ExerciseIntensity,
} from '@project4/contracts';

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
  return normalizeResearchCalendarDateTime(value);
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
