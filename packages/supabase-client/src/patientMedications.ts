import type { MedicationRecord } from '@project4/contracts';
import {
  normalizeMedicationDateTime,
  type MedicationDraft,
} from '@project4/forms';

import type { AppSupabaseClient } from './index';

export interface MedicationRow {
  entry_id: string;
  name: string | null;
  dose: string | null;
  notes: string | null;
  is_chronic_therapy: boolean | null;
}

export function toMedicationRecord(row: MedicationRow, occurredAt: string): MedicationRecord {
  return {
    entryId: row.entry_id,
    occurredAt,
    name: row.name,
    dose: row.dose,
    reason: row.notes,
    isChronicTherapy: row.is_chronic_therapy,
  };
}

export async function createPatientMedication(
  client: AppSupabaseClient,
  _patientId: string,
  draft: MedicationDraft,
): Promise<MedicationRecord> {
  const occurredAt = normalizeMedicationDateTime(draft.takenAt);
  if (!occurredAt) throw new Error('Cannot persist medication without a valid time.');

  const name = draft.name?.trim() || null;
  const dose = draft.dose?.trim() || null;
  const reason = draft.reason?.trim() || null;
  const { data, error } = await client.rpc('save_patient_medication', {
    p_entry_id: draft.entryId ?? null,
    p_occurred_at: occurredAt,
    p_name: name,
    p_dose: dose,
    p_notes: reason,
    p_is_chronic_therapy: draft.isChronicTherapy ?? null,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Medication save returned an invalid entry ID.');

  return {
    entryId: data,
    occurredAt,
    name,
    dose,
    reason,
    isChronicTherapy: draft.isChronicTherapy ?? null,
  };
}

export async function listCompletePatientMedicationEntryIds(
  client: AppSupabaseClient,
  entryIds: string[],
): Promise<string[]> {
  if (!entryIds.length) return [];

  const { data, error } = await client
    .from('medication_details')
    .select('entry_id')
    .in('entry_id', entryIds)
    .not('name', 'is', null)
    .not('dose', 'is', null)
    .not('is_chronic_therapy', 'is', null)
    .returns<Array<{ entry_id: string }>>();

  if (error) throw error;
  return data.map((row) => row.entry_id);
}

export async function getPatientMedication(
  client: AppSupabaseClient,
  entryId: string,
  occurredAt: string,
): Promise<MedicationRecord | null> {
  const { data, error } = await client
    .from('medication_details')
    .select('entry_id, name, dose, notes, is_chronic_therapy')
    .eq('entry_id', entryId)
    .maybeSingle<MedicationRow>();

  if (error) throw error;
  return data ? toMedicationRecord(data, occurredAt) : null;
}
