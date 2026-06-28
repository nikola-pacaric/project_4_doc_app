import type { MealRecord } from '@project4/contracts';
import { normalizeMealDateTime, type MealDraft, type MealType } from '@project4/forms';

import type { AppSupabaseClient } from './index';

interface MealRow {
  entry_id: string;
  meal_type: MealType | null;
  name: string | null;
  description: string | null;
}

const mealColumns = 'entry_id, meal_type, name, description';

export async function listPatientMeals(
  client: AppSupabaseClient,
  patientId: string,
  dayStart: string,
  dayEnd: string,
): Promise<MealRecord[]> {
  const { data: entries, error: entriesError } = await client
    .from('patient_entries')
    .select('id, occurred_at')
    .eq('patient_id', patientId)
    .eq('kind', 'meal')
    .gte('occurred_at', dayStart)
    .lt('occurred_at', dayEnd)
    .order('occurred_at', { ascending: true })
    .returns<Array<{ id: string; occurred_at: string }>>();
  if (entriesError) throw entriesError;
  if (entries.length === 0) return [];

  const { data: details, error: detailsError } = await client
    .from('meal_details')
    .select(mealColumns)
    .in(
      'entry_id',
      entries.map((entry) => entry.id),
    )
    .returns<MealRow[]>();
  if (detailsError) throw detailsError;

  const detailsByEntry = new Map(details.map((detail) => [detail.entry_id, detail]));
  return entries.flatMap((entry) => {
    const detail = detailsByEntry.get(entry.id);
    return detail
      ? [
          {
            entryId: entry.id,
            occurredAt: entry.occurred_at,
            type: detail.meal_type,
            name: detail.name,
            description: detail.description,
          },
        ]
      : [];
  });
}

export async function savePatientMeals(
  client: AppSupabaseClient,
  patientId: string,
  occurredAt: string,
  drafts: MealDraft[],
  previousEntryIds: string[],
): Promise<void> {
  const retainedIds = drafts.flatMap((draft) => (draft.entryId ? [draft.entryId] : []));
  const removedIds = previousEntryIds.filter((entryId) => !retainedIds.includes(entryId));

  for (const entryId of removedIds) {
    const { error } = await client.from('patient_entries').delete().eq('id', entryId);
    if (error) throw error;
  }

  for (const [index, draft] of drafts.entries()) {
    const entryTime =
      normalizeMealDateTime(draft.occurredAt) ??
      new Date(new Date(occurredAt).getTime() + index * 60_000).toISOString();
    const detail = {
      meal_type: draft.type,
      name: draft.name?.trim(),
      description: draft.description?.trim() || null,
    };

    if (draft.entryId) {
      const { error: entryError } = await client
        .from('patient_entries')
        .update({ occurred_at: entryTime })
        .eq('id', draft.entryId);
      if (entryError) throw entryError;

      const { error } = await client
        .from('meal_details')
        .update(detail)
        .eq('entry_id', draft.entryId);
      if (error) throw error;
      continue;
    }

    const { data: entry, error: entryError } = await client
      .from('patient_entries')
      .insert({ patient_id: patientId, kind: 'meal', occurred_at: entryTime, text: null })
      .select('id')
      .single<{ id: string }>();
    if (entryError) throw entryError;

    const { error: detailError } = await client
      .from('meal_details')
      .insert({ entry_id: entry.id, ...detail });
    if (!detailError) continue;

    await client.from('patient_entries').delete().eq('id', entry.id);
    throw detailError;
  }
}
