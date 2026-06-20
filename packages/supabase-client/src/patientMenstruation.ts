import type {
  MenstruationFlow,
  MenstruationPainLevel,
  MenstruationRecord,
} from '@project4/contracts';
import {
  isCompleteMenstruationDraft,
  normalizeMenstruationDateTime,
  type MenstruationDraft,
} from '@project4/forms';

import type { AppSupabaseClient } from './index';

export interface MenstruationRow {
  entry_id: string;
  flow: MenstruationFlow;
  pain_level: MenstruationPainLevel;
  notes: string | null;
}

export function toMenstruationRecord(row: MenstruationRow, occurredAt: string): MenstruationRecord {
  return {
    entryId: row.entry_id,
    occurredAt,
    flow: row.flow,
    painLevel: row.pain_level,
    notes: row.notes,
  };
}

export async function createPatientMenstruation(
  client: AppSupabaseClient,
  patientId: string,
  draft: MenstruationDraft,
): Promise<MenstruationRecord> {
  if (!isCompleteMenstruationDraft(draft)) {
    throw new Error('Cannot persist an incomplete menstruation draft.');
  }

  const occurredAt = normalizeMenstruationDateTime(draft.occurredAt);
  if (!occurredAt) throw new Error('Cannot persist menstruation without a valid time.');

  const { data: entry, error: entryError } = await client
    .from('patient_entries')
    .insert({ patient_id: patientId, kind: 'menstruation', occurred_at: occurredAt, text: null })
    .select('id')
    .single<{ id: string }>();
  if (entryError) throw entryError;

  const detail = {
    entry_id: entry.id,
    flow: draft.flow,
    pain_level: draft.painLevel,
    notes: draft.notes?.trim() || null,
  };
  const { data, error: detailError } = await client
    .from('menstruation_events')
    .insert(detail)
    .select('entry_id, flow, pain_level, notes')
    .single<MenstruationRow>();
  if (!detailError) return toMenstruationRecord(data, occurredAt);

  await client.from('patient_entries').delete().eq('id', entry.id);
  throw detailError;
}
