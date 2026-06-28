import type { BristolStoolType, StoolRecord, StoolUrgencyLevel } from '@project4/contracts';
import { isCompleteStoolDraft, type StoolDraft } from '@project4/forms';

import type { AppSupabaseClient } from './index';

export interface StoolRow {
  entry_id: string;
  bristol_type: BristolStoolType;
  urgency_level: StoolUrgencyLevel;
  pain: boolean;
  mucus: boolean;
  blood: boolean;
  fatty_stool: boolean;
  black_stool: boolean;
  notes: string | null;
}

export function toStoolRecord(row: StoolRow, occurredAt: string): StoolRecord {
  return {
    entryId: row.entry_id,
    occurredAt,
    bristolType: row.bristol_type,
    urgencyLevel: row.urgency_level,
    pain: row.pain,
    mucus: row.mucus,
    blood: row.blood,
    fattyStool: row.fatty_stool,
    blackStool: row.black_stool,
    notes: row.notes,
  };
}

export async function createPatientStool(
  client: AppSupabaseClient,
  _patientId: string,
  draft: StoolDraft,
  occurredAt = new Date().toISOString(),
): Promise<StoolRecord> {
  if (!isCompleteStoolDraft(draft)) {
    throw new Error('Cannot persist an incomplete stool draft.');
  }

  const notes = draft.notes?.trim() || null;
  const { data, error } = await client.rpc('save_patient_stool', {
    p_entry_id: draft.entryId ?? null,
    p_occurred_at: occurredAt,
    p_bristol_type: draft.bristolType,
    p_urgency_level: draft.urgencyLevel,
    p_pain: draft.pain,
    p_mucus: draft.mucus,
    p_blood: draft.blood,
    p_fatty_stool: draft.fattyStool,
    p_black_stool: draft.blackStool,
    p_notes: notes,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Stool save returned an invalid entry ID.');

  return {
    entryId: data,
    occurredAt,
    bristolType: draft.bristolType,
    urgencyLevel: draft.urgencyLevel,
    pain: draft.pain,
    mucus: draft.mucus,
    blood: draft.blood,
    fattyStool: draft.fattyStool,
    blackStool: draft.blackStool,
    notes,
  };
}

export async function getPatientStool(
  client: AppSupabaseClient,
  entryId: string,
  occurredAt: string,
): Promise<StoolRecord | null> {
  const { data, error } = await client
    .from('stool_details')
    .select(
      'entry_id, bristol_type, urgency_level, pain, mucus, blood, fatty_stool, black_stool, notes',
    )
    .eq('entry_id', entryId)
    .maybeSingle<StoolRow>();

  if (error) throw error;
  return data ? toStoolRecord(data, occurredAt) : null;
}
