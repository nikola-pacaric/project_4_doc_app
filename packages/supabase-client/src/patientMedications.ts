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
  _patientId: string,
  draft: MedicationDraft,
): Promise<MedicationRecord> {
  if (!isCompleteMedicationDraft(draft)) {
    throw new Error('Cannot persist an incomplete medication draft.');
  }

  const occurredAt = normalizeMedicationDateTime(draft.takenAt);
  if (!occurredAt) throw new Error('Cannot persist medication without a valid time.');

  const name = draft.name.trim();
  const dose = draft.dose.trim();
  const reason = draft.reason?.trim() || null;
  const { data, error } = await client.rpc('save_patient_medication', {
    p_entry_id: draft.entryId ?? null,
    p_occurred_at: occurredAt,
    p_name: name,
    p_dose: dose,
    p_notes: reason,
    p_is_chronic_therapy: draft.isChronicTherapy,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Medication save returned an invalid entry ID.');

  return {
    entryId: data,
    occurredAt,
    name,
    dose,
    reason,
    isChronicTherapy: draft.isChronicTherapy,
  };
}
