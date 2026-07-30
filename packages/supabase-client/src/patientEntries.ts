import type { PatientEntry } from '@project4/contracts';

import type { AppSupabaseClient } from './index';
import type { Database } from './database.types';
import { deleteEntryPhotoObjects, listEntryPhotos } from './patientPhotos';
import { drainPendingPatientPhotoCleanups } from './patientPhotoCleanup';

export type PatientEntryRow = Pick<
  Database['public']['Tables']['patient_entries']['Row'],
  'id' | 'patient_id' | 'kind' | 'occurred_at' | 'text' | 'created_at' | 'updated_at'
>;

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

/**
 * Load patient timeline entries in an half-open ISO range [rangeStart, rangeEnd).
 * Use with local day bounds (e.g. localDayRange) for a single calendar day.
 */
export async function listPatientEntriesInRange(
  client: AppSupabaseClient,
  patientId: string,
  rangeStart: string,
  rangeEnd: string,
): Promise<PatientEntry[]> {
  const { data, error } = await client
    .from('patient_entries')
    .select(entryColumns)
    .eq('patient_id', patientId)
    .gte('occurred_at', rangeStart)
    .lt('occurred_at', rangeEnd)
    .order('occurred_at', { ascending: false })
    .returns<PatientEntryRow[]>();

  if (error) {
    throw error;
  }

  return data.map(toPatientEntry);
}

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
): Promise<{ photoCleanupPending: boolean }> {
  const photos = await listEntryPhotos(client, entryId);

  const { data, error } = await client
    .from('patient_entries')
    .delete()
    .eq('id', entryId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('ENTRY_DELETE_NOT_ALLOWED');
  }

  try {
    await deleteEntryPhotoObjects(client, photos);
    return { photoCleanupPending: false };
    await drainPendingPatientPhotoCleanups(client);
  } catch {
    return { photoCleanupPending: true };
  }
}
