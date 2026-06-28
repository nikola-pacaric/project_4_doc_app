import type { PatientEntry } from '@project4/contracts';
import { NO_STOOL_TODAY_TEXT } from '@project4/contracts';
import { isCompleteNoteDraft, normalizeNoteDateTime, type NoteDraft } from '@project4/forms';

import type { AppSupabaseClient } from './index';
import { toPatientEntry, type PatientEntryRow } from './patientEntries';

const noteEntryColumns = 'id, patient_id, kind, occurred_at, text, created_at, updated_at';

export async function createPatientNote(
  client: AppSupabaseClient,
  _patientId: string,
  draft: NoteDraft,
): Promise<PatientEntry> {
  if (!isCompleteNoteDraft(draft)) {
    throw new Error('Cannot persist an incomplete note draft.');
  }

  const occurredAt = normalizeNoteDateTime(draft.occurredAt);
  if (!occurredAt) throw new Error('Cannot persist a note without a valid time.');

  const { data, error } = await client
    .rpc('save_patient_note', {
      p_entry_id: draft.entryId ?? null,
      p_occurred_at: occurredAt,
      p_text: draft.text.trim(),
    })
    .select(noteEntryColumns)
    .single<PatientEntryRow>();

  if (error) throw error;
  return toPatientEntry(data);
}

export async function createPatientNoStoolMarker(
  client: AppSupabaseClient,
  patientId: string,
  occurredAt: string,
): Promise<PatientEntry> {
  return createPatientNote(client, patientId, {
    occurredAt,
    text: NO_STOOL_TODAY_TEXT,
  });
}
