import type { PatientEntry } from '@project4/contracts';

import type { AppSupabaseClient } from './index';

export interface PatientEntryRow {
  id: string;
  patient_id: string;
  kind: PatientEntry['kind'];
  occurred_at: string;
  text: string | null;
  created_at: string;
  updated_at: string;
}

export function toPatientEntry(row: PatientEntryRow): PatientEntry {
  return {
    id: row.id,
    patientId: row.patient_id,
    kind: row.kind,
    occurredAt: row.occurred_at,
    text: row.text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const entryColumns = 'id, patient_id, kind, occurred_at, text, created_at, updated_at';

export async function listRecentPatientEntries(
  client: AppSupabaseClient,
  patientId: string,
  days = 7,
): Promise<PatientEntry[]> {
  const since = new Date();
  since.setDate(since.getDate() - Math.max(1, days));

  const { data, error } = await client
    .from('patient_entries')
    .select(entryColumns)
    .eq('patient_id', patientId)
    .gte('occurred_at', since.toISOString())
    .order('occurred_at', { ascending: false })
    .returns<PatientEntryRow[]>();

  if (error) {
    throw error;
  }

  return data.map(toPatientEntry);
}

export async function createTextEntry(
  client: AppSupabaseClient,
  patientId: string,
  text: string,
  occurredAt: string,
): Promise<PatientEntry> {
  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new Error('ENTRY_TEXT_REQUIRED');
  }

  const { data, error } = await client
    .from('patient_entries')
    .insert({
      patient_id: patientId,
      kind: 'text',
      occurred_at: occurredAt,
      text: normalizedText,
    })
    .select(entryColumns)
    .single<PatientEntryRow>();

  if (error) {
    throw error;
  }

  return toPatientEntry(data);
}

export async function updateEntryTimestamp(
  client: AppSupabaseClient,
  entryId: string,
  occurredAt: string,
): Promise<PatientEntry> {
  const { data, error } = await client
    .from('patient_entries')
    .update({ occurred_at: occurredAt })
    .eq('id', entryId)
    .select(entryColumns)
    .single<PatientEntryRow>();

  if (error) {
    throw error;
  }

  return toPatientEntry(data);
}

export async function deletePatientEntry(
  client: AppSupabaseClient,
  entryId: string,
): Promise<void> {
  const { error } = await client.from('patient_entries').delete().eq('id', entryId);

  if (error) {
    throw error;
  }
}
