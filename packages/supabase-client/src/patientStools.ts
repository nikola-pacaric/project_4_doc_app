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
  patientId: string,
  draft: StoolDraft,
  occurredAt = new Date().toISOString(),
): Promise<StoolRecord> {
  if (!isCompleteStoolDraft(draft)) {
    throw new Error('Cannot persist an incomplete stool draft.');
  }

  const { data: entry, error: entryError } = await client
    .from('patient_entries')
    .insert({ patient_id: patientId, kind: 'stool', occurred_at: occurredAt, text: null })
    .select('id')
    .single<{ id: string }>();
  if (entryError) throw entryError;

  const detail = {
    entry_id: entry.id,
    bristol_type: draft.bristolType,
    urgency: draft.urgencyLevel !== 'none',
    urgency_level: draft.urgencyLevel,
    pain: draft.pain,
    mucus: draft.mucus,
    blood: draft.blood,
    fatty_stool: draft.fattyStool,
    black_stool: draft.blackStool,
    notes: draft.notes?.trim() || null,
  };
  const { data, error: detailError } = await client
    .from('stool_details')
    .insert(detail)
    .select(
      'entry_id, bristol_type, urgency_level, pain, mucus, blood, fatty_stool, black_stool, notes',
    )
    .single<StoolRow>();
  if (!detailError) return toStoolRecord(data, occurredAt);

  await client.from('patient_entries').delete().eq('id', entry.id);
  throw detailError;
}
