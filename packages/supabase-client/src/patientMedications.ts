import type { MedicationRecord } from '@project4/contracts';
import {
  isCompleteMedicationDraft,
  normalizeMedicationDateTime,
  type MedicationDraft,
} from '@project4/forms';

import type { AppSupabaseClient } from './index';

export interface MedicationRow {
  entry_id: string;
  name: string;
  dose: string;
  notes: string | null;
  is_chronic_therapy: boolean;
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
  patientId: string,
  draft: MedicationDraft,
): Promise<MedicationRecord> {
  if (!isCompleteMedicationDraft(draft)) {
    throw new Error('Cannot persist an incomplete medication draft.');
  }

  const occurredAt = normalizeMedicationDateTime(draft.takenAt);
  if (!occurredAt) throw new Error('Cannot persist medication without a valid time.');

  const { data: entry, error: entryError } = await client
    .from('patient_entries')
    .insert({ patient_id: patientId, kind: 'medication', occurred_at: occurredAt, text: null })
    .select('id')
    .single<{ id: string }>();
  if (entryError) throw entryError;

  const detail = {
    entry_id: entry.id,
    name: draft.name.trim(),
    dose: draft.dose.trim(),
    notes: draft.reason?.trim() || null,
    is_chronic_therapy: draft.isChronicTherapy,
  };
  const { data, error: detailError } = await client
    .from('medication_details')
    .insert(detail)
    .select('entry_id, name, dose, notes, is_chronic_therapy')
    .single<MedicationRow>();
  if (!detailError) return toMedicationRecord(data, occurredAt);

  await client.from('patient_entries').delete().eq('id', entry.id);
  throw detailError;
}
