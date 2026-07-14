import type { PatientEntry } from '@project4/contracts';
import { NO_STOOL_TODAY_TEXT } from '@project4/contracts';
import { isCompleteNoteDraft, normalizeNoteDateTime, type NoteDraft } from '@project4/forms';

import type { AppSupabaseClient } from './index';
import {
  deletePatientEntry,
  toPatientEntry,
  type PatientEntryRow,
} from './patientEntries';

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

export interface CreateNoStoolMarkerOptions {
  /** Update an existing no-stool note entry. */
  entryId?: string;
  /** Delete a previous stool (or other) entry before creating the marker. */
  replaceEntryId?: string;
}

/**
 * Saves the special "No stool today" note marker.
 * - New day: create a note.
 * - Editing an existing no-stool note: pass entryId.
 * - Converting a stool entry: pass replaceEntryId so the stool row is removed first.
 */
export async function createPatientNoStoolMarker(
  client: AppSupabaseClient,
  patientId: string,
  occurredAt: string,
  options: CreateNoStoolMarkerOptions = {},
): Promise<PatientEntry> {
  if (options.replaceEntryId) {
    await deletePatientEntry(client, options.replaceEntryId);
  }

  return createPatientNote(client, patientId, {
    entryId: options.entryId,
    occurredAt,
    text: NO_STOOL_TODAY_TEXT,
  });
}
