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
  _patientId: string,
  draft: MenstruationDraft,
): Promise<MenstruationRecord> {
  if (!isCompleteMenstruationDraft(draft)) {
    throw new Error('Cannot persist an incomplete menstruation draft.');
  }

  const occurredAt = normalizeMenstruationDateTime(draft.occurredAt);
  if (!occurredAt) throw new Error('Cannot persist menstruation without a valid time.');

  const notes = draft.notes?.trim() || null;
  const { data, error } = await client.rpc('save_patient_menstruation', {
    p_entry_id: draft.entryId ?? null,
    p_occurred_at: occurredAt,
    p_flow: draft.flow,
    p_pain_level: draft.painLevel,
    p_notes: notes,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Period save returned an invalid entry ID.');

  return {
    entryId: data,
    occurredAt,
    flow: draft.flow,
    painLevel: draft.painLevel,
    notes,
  };
}

export async function getPatientMenstruation(
  client: AppSupabaseClient,
  entryId: string,
  occurredAt: string,
): Promise<MenstruationRecord | null> {
  const { data, error } = await client
    .from('menstruation_events')
    .select('entry_id, flow, pain_level, notes')
    .eq('entry_id', entryId)
    .maybeSingle<MenstruationRow>();

  if (error) throw error;
  return data ? toMenstruationRecord(data, occurredAt) : null;
}
