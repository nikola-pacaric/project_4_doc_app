import type { DailyFormRecord } from '@project4/contracts';
import type { DailyFormDraft } from '@project4/forms';

import type { AppSupabaseClient } from './index';

interface DailyFormRow {
  entry_id: string;
  wake_time: string | null;
  appetite: 'low' | 'usual' | 'high' | null;
  had_physical_activity: boolean | null;
  sleep_notes: string | null;
  stress_level: 1 | 2 | 3 | null;
  day_description: string | null;
  took_chronic_therapy: boolean | null;
  took_medication_outside_chronic_therapy: boolean | null;
  medication_outside_chronic_therapy: string | null;
  had_menstruation: boolean | null;
  menstruation_notes: string | null;
  energy_level: 1 | 2 | 3 | null;
  had_naps: boolean | null;
  naps: string | null;
  completed_at: string | null;
}

const detailColumns =
  'entry_id, wake_time, appetite, had_physical_activity, sleep_notes, stress_level, day_description, took_chronic_therapy, took_medication_outside_chronic_therapy, medication_outside_chronic_therapy, had_menstruation, menstruation_notes, energy_level, had_naps, naps, completed_at';

export function toDailyFormDetails(row: DailyFormRow): DailyFormRecord['details'] {
  return {
    entryId: row.entry_id,
    wakeTime: row.wake_time?.slice(0, 5) ?? null,
    sleepDuration: row.sleep_notes?.slice(0, 5) ?? null,
    appetite: row.appetite,
    hadPhysicalActivity: row.had_physical_activity,
    activityNotes: null,
    stressLevel: row.stress_level,
    dayDescription: row.day_description,
    tookChronicTherapy: row.took_chronic_therapy,
    tookMedicationOutsideChronicTherapy: row.took_medication_outside_chronic_therapy,
    medicationOutsideChronicTherapy: row.medication_outside_chronic_therapy,
    hadMenstruation: row.had_menstruation,
    menstruationNotes: row.menstruation_notes,
    energyLevel: row.energy_level,
    hadNaps: row.had_naps,
    naps: row.naps,
    completedAt: row.completed_at,
  };
}

function toRow(entryId: string, draft: DailyFormDraft, includeMenstruation: boolean) {
  return {
    entry_id: entryId,
    wake_time: draft.wakeTime || null,
    appetite: draft.appetite ?? null,
    had_physical_activity: draft.hadPhysicalActivity ?? null,
    sleep_notes: draft.sleepDuration || null,
    stress_level: draft.stressLevel ?? null,
    day_description: draft.dayDescription?.trim() || null,
    took_chronic_therapy: draft.tookChronicTherapy ?? false,
    took_medication_outside_chronic_therapy: draft.tookMedicationOutsideChronicTherapy ?? null,
    medication_outside_chronic_therapy: draft.tookMedicationOutsideChronicTherapy
      ? draft.medicationOutsideChronicTherapy?.trim() || null
      : null,
    had_menstruation: includeMenstruation ? (draft.hadMenstruation ?? null) : null,
    menstruation_notes: null,
    energy_level: draft.energyLevel ?? null,
    had_naps: draft.hadNaps ?? null,
    naps: draft.hadNaps ? draft.naps?.trim() || null : null,
  };
}

export async function completePatientDailyForm(
  client: AppSupabaseClient,
  entryId: string,
): Promise<string> {
  const { data, error } = await client.rpc('complete_patient_daily_form', {
    p_entry_id: entryId,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Daily completion returned an invalid timestamp.');
  return data;
}

export async function getPatientDailyForm(
  client: AppSupabaseClient,
  patientId: string,
  dayStart: string,
  dayEnd: string,
): Promise<DailyFormRecord | null> {
  const { data: entry, error: entryError } = await client
    .from('patient_entries')
    .select('id, occurred_at')
    .eq('patient_id', patientId)
    .eq('kind', 'daily')
    .gte('occurred_at', dayStart)
    .lt('occurred_at', dayEnd)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; occurred_at: string }>();

  if (entryError) throw entryError;
  if (!entry) return null;

  const { data: details, error: detailsError } = await client
    .from('daily_form_details')
    .select(detailColumns)
    .eq('entry_id', entry.id)
    .single<DailyFormRow>();

  if (detailsError) throw detailsError;
  return { entryId: entry.id, occurredAt: entry.occurred_at, details: toDailyFormDetails(details) };
}

export async function savePatientDailyForm(
  client: AppSupabaseClient,
  patientId: string,
  occurredAt: string,
  draft: DailyFormDraft,
  includeMenstruation: boolean,
  completeDay: boolean,
  existingEntryId?: string,
): Promise<void> {
  if (existingEntryId) {
    const { error } = await client
      .from('daily_form_details')
      .update(toRow(existingEntryId, draft, includeMenstruation))
      .eq('entry_id', existingEntryId);
    if (error) throw error;
    if (completeDay) await completePatientDailyForm(client, existingEntryId);
    return;
  }

  const { data: entry, error: entryError } = await client
    .from('patient_entries')
    .insert({ patient_id: patientId, kind: 'daily', occurred_at: occurredAt, text: null })
    .select('id')
    .single<{ id: string }>();
  if (entryError) throw entryError;

  const { error: detailsError } = await client
    .from('daily_form_details')
    .insert(toRow(entry.id, draft, includeMenstruation));
  if (!detailsError) {
    if (completeDay) await completePatientDailyForm(client, entry.id);
    return;
  }

  await client.from('patient_entries').delete().eq('id', entry.id);
  throw detailsError;
}
