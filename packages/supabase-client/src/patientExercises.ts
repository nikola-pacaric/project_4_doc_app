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
  patientId: string,
  draft: ExerciseDraft,
): Promise<ExerciseRecord> {
  if (!isCompleteExerciseDraft(draft)) {
    throw new Error('Cannot persist an incomplete exercise draft.');
  }

  const occurredAt = normalizeExerciseDateTime(draft.occurredAt);
  if (!occurredAt) throw new Error('Cannot persist exercise without a valid time.');

  const { data: entry, error: entryError } = await client
    .from('patient_entries')
    .insert({ patient_id: patientId, kind: 'exercise', occurred_at: occurredAt, text: null })
    .select('id')
    .single<{ id: string }>();
  if (entryError) throw entryError;

  const detail = {
    entry_id: entry.id,
    activity: draft.activity.trim(),
    duration_minutes: draft.durationMinutes,
    intensity: draft.intensity,
    notes: draft.notes?.trim() || null,
  };
  const { data, error: detailError } = await client
    .from('exercise_details')
    .insert(detail)
    .select('entry_id, activity, duration_minutes, intensity, notes')
    .single<ExerciseRow>();
  if (!detailError) return toExerciseRecord(data, occurredAt);

  await client.from('patient_entries').delete().eq('id', entry.id);
  throw detailError;
}
