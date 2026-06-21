import type { PatientEntry } from '@project4/contracts';
import { isCompleteNoteDraft, normalizeNoteDateTime, type NoteDraft } from '@project4/forms';

import type { AppSupabaseClient } from './index';
import { toPatientEntry, type PatientEntryRow } from './patientEntries';

const noteEntryColumns = 'id, patient_id, kind, occurred_at, text, created_at, updated_at';

export async function createPatientNote(
  client: AppSupabaseClient,
  patientId: string,
  draft: NoteDraft,
): Promise<PatientEntry> {
  if (!isCompleteNoteDraft(draft)) {
    throw new Error('Cannot persist an incomplete note draft.');
  }

  const occurredAt = normalizeNoteDateTime(draft.occurredAt);
  if (!occurredAt) throw new Error('Cannot persist a note without a valid time.');

  const { data, error } = await client
    .from('patient_entries')
    .insert({
      patient_id: patientId,
      kind: 'note',
      occurred_at: occurredAt,
      text: draft.text.trim(),
    })
    .select(noteEntryColumns)
    .single<PatientEntryRow>();

  if (error) throw error;
  return toPatientEntry(data);
}
