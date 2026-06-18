import type {
  PainDescription,
  PainLocation,
  SymptomIntensity,
  SymptomRecord,
  SymptomType,
} from '@project4/contracts';
import { normalizeSymptomDateTime, type SymptomDraft } from '@project4/forms';

import type { AppSupabaseClient } from './index';

export interface SymptomRow {
  entry_id: string;
  symptom_type: SymptomType;
  custom_type: string | null;
  started_at: string;
  ended_at: string | null;
  intensity: SymptomIntensity;
  modifying_factors: string | null;
  woke_from_sleep: boolean;
  pain_location: PainLocation | null;
  pain_location_custom: string | null;
  pain_radiates: boolean | null;
  pain_radiation: string | null;
  pain_description: PainDescription | null;
  pain_description_custom: string | null;
}

const symptomColumns =
  'entry_id, symptom_type, custom_type, started_at, ended_at, intensity, modifying_factors, woke_from_sleep, pain_location, pain_location_custom, pain_radiates, pain_radiation, pain_description, pain_description_custom';

export function toSymptomRecord(row: SymptomRow, occurredAt: string): SymptomRecord {
  return {
    entryId: row.entry_id,
    occurredAt,
    type: row.symptom_type,
    customType: row.custom_type,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    intensity: row.intensity,
    modifyingFactors: row.modifying_factors,
    wokeFromSleep: row.woke_from_sleep,
    painLocation: row.pain_location,
    painLocationCustom: row.pain_location_custom,
    painRadiates: row.pain_radiates,
    painRadiation: row.pain_radiation,
    painDescription: row.pain_description,
    painDescriptionCustom: row.pain_description_custom,
  };
}

export async function listPatientSymptoms(
  client: AppSupabaseClient,
  patientId: string,
  dayStart: string,
  dayEnd: string,
): Promise<SymptomRecord[]> {
  const { data: entries, error: entriesError } = await client
    .from('patient_entries')
    .select('id, occurred_at')
    .eq('patient_id', patientId)
    .eq('kind', 'symptom')
    .gte('occurred_at', dayStart)
    .lt('occurred_at', dayEnd)
    .order('occurred_at', { ascending: true })
    .returns<Array<{ id: string; occurred_at: string }>>();
  if (entriesError) throw entriesError;
  if (entries.length === 0) return [];

  const { data: details, error: detailsError } = await client
    .from('symptom_details')
    .select(symptomColumns)
    .in(
      'entry_id',
      entries.map((entry) => entry.id),
    )
    .returns<SymptomRow[]>();
  if (detailsError) throw detailsError;

  const detailsByEntry = new Map(details.map((detail) => [detail.entry_id, detail]));
  return entries.flatMap((entry) => {
    const detail = detailsByEntry.get(entry.id);
    return detail ? [toSymptomRecord(detail, entry.occurred_at)] : [];
  });
}

function toDetailRow(entryId: string, draft: SymptomDraft) {
  const startedAt = normalizeSymptomDateTime(draft.startedAt);
  const endedAt = normalizeSymptomDateTime(draft.endedAt);
  if (!draft.type || !startedAt || !draft.intensity || draft.wokeFromSleep === undefined) {
    throw new Error('Cannot persist an incomplete symptom draft.');
  }

  const pain = draft.type === 'pain';
  return {
    entry_id: entryId,
    symptom_type: draft.type,
    custom_type: draft.type === 'other' ? draft.customType?.trim() || null : null,
    started_at: startedAt,
    ended_at: endedAt,
    intensity: draft.intensity,
    modifying_factors: draft.modifyingFactors?.trim() || null,
    woke_from_sleep: draft.wokeFromSleep,
    pain_location: pain ? (draft.painLocation ?? null) : null,
    pain_location_custom:
      pain && draft.painLocation === 'other' ? draft.painLocationCustom?.trim() || null : null,
    pain_radiates: pain ? (draft.painRadiates ?? null) : null,
    pain_radiation: pain && draft.painRadiates ? draft.painRadiation?.trim() || null : null,
    pain_description: pain ? (draft.painDescription ?? null) : null,
    pain_description_custom:
      pain && draft.painDescription === 'other'
        ? draft.painDescriptionCustom?.trim() || null
        : null,
  };
}

export async function savePatientSymptoms(
  client: AppSupabaseClient,
  patientId: string,
  drafts: SymptomDraft[],
  previousEntryIds: string[],
): Promise<void> {
  const retainedIds = drafts.flatMap((draft) => (draft.entryId ? [draft.entryId] : []));
  const removedIds = previousEntryIds.filter((entryId) => !retainedIds.includes(entryId));

  for (const entryId of removedIds) {
    const { error } = await client.from('patient_entries').delete().eq('id', entryId);
    if (error) throw error;
  }

  for (const draft of drafts) {
    const startedAt = normalizeSymptomDateTime(draft.startedAt);
    if (!startedAt) throw new Error('Cannot persist a symptom without a valid start time.');

    if (draft.entryId) {
      const { error: entryError } = await client
        .from('patient_entries')
        .update({ occurred_at: startedAt })
        .eq('id', draft.entryId);
      if (entryError) throw entryError;

      const { error: detailError } = await client
        .from('symptom_details')
        .update(toDetailRow(draft.entryId, draft))
        .eq('entry_id', draft.entryId);
      if (detailError) throw detailError;
      continue;
    }

    const { data: entry, error: entryError } = await client
      .from('patient_entries')
      .insert({ patient_id: patientId, kind: 'symptom', occurred_at: startedAt, text: null })
      .select('id')
      .single<{ id: string }>();
    if (entryError) throw entryError;

    const { error: detailError } = await client
      .from('symptom_details')
      .insert(toDetailRow(entry.id, draft));
    if (!detailError) continue;

    await client.from('patient_entries').delete().eq('id', entry.id);
    throw detailError;
  }
}
