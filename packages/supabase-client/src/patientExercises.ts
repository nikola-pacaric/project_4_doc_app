import type { ExerciseIntensity, ExerciseRecord } from '@project4/contracts';
import {
  isCompleteExerciseDraft,
  normalizeExerciseDateTime,
  type ExerciseDraft,
} from '@project4/forms';

import type { AppSupabaseClient } from './index';

export interface ExerciseRow {
  entry_id: string;
  activity: string;
  duration_minutes: number;
  intensity: ExerciseIntensity;
  notes: string | null;
}

export function toExerciseRecord(row: ExerciseRow, occurredAt: string): ExerciseRecord {
  return {
    entryId: row.entry_id,
    occurredAt,
    activity: row.activity,
    durationMinutes: row.duration_minutes,
    intensity: row.intensity,
    notes: row.notes,
  };
}

export async function createPatientExercise(
  client: AppSupabaseClient,
  _patientId: string,
  draft: ExerciseDraft,
): Promise<ExerciseRecord> {
  if (!isCompleteExerciseDraft(draft)) {
    throw new Error('Cannot persist an incomplete exercise draft.');
  }

  const occurredAt = normalizeExerciseDateTime(draft.occurredAt);
  if (!occurredAt) throw new Error('Cannot persist exercise without a valid time.');

  const activity = draft.activity.trim();
  const notes = draft.notes?.trim() || null;
  const { data, error } = await client.rpc('save_patient_exercise', {
    p_entry_id: draft.entryId ?? null,
    p_occurred_at: occurredAt,
    p_activity: activity,
    p_duration_minutes: draft.durationMinutes,
    p_intensity: draft.intensity,
    p_notes: notes,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Exercise save returned an invalid entry ID.');

  return {
    entryId: data,
    occurredAt,
    activity,
    durationMinutes: draft.durationMinutes,
    intensity: draft.intensity,
    notes,
  };
}
