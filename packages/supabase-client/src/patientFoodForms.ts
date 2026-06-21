import type { FoodFormDetails, FoodFormRecord } from '@project4/contracts';
import { isCompleteFoodHydrationDraft, type FoodHydrationDraft } from '@project4/forms';

import type { AppSupabaseClient } from './index';

export interface FoodFormRow {
  entry_id: string;
  water_liters: number | null;
  has_other_fluids: boolean | null;
  other_fluids: string | null;
}

const foodFormColumns = 'entry_id, water_liters, has_other_fluids, other_fluids';

export function toFoodFormDetails(row: FoodFormRow): FoodFormDetails {
  return {
    entryId: row.entry_id,
    waterLiters: row.water_liters,
    hasOtherFluids: row.has_other_fluids,
    otherFluids: row.other_fluids,
  };
}

export async function getPatientFoodForm(
  client: AppSupabaseClient,
  patientId: string,
  dayStart: string,
  dayEnd: string,
): Promise<FoodFormRecord | null> {
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
    .from('food_form_details')
    .select(foodFormColumns)
    .eq('entry_id', entry.id)
    .maybeSingle<FoodFormRow>();
  if (detailsError) throw detailsError;

  return {
    entryId: entry.id,
    occurredAt: entry.occurred_at,
    details: details ? toFoodFormDetails(details) : null,
  };
}

function toFoodFormRow(entryId: string, draft: FoodHydrationDraft): FoodFormRow {
  if (!isCompleteFoodHydrationDraft(draft)) {
    throw new Error('Cannot persist incomplete food hydration data.');
  }

  return {
    entry_id: entryId,
    water_liters: draft.waterLiters,
    has_other_fluids: draft.hasOtherFluids,
    other_fluids: draft.hasOtherFluids ? draft.otherFluids.trim() : null,
  };
}

export async function savePatientFoodForm(
  client: AppSupabaseClient,
  patientId: string,
  occurredAt: string,
  draft: FoodHydrationDraft,
  existingEntryId?: string,
  existingDetails = false,
): Promise<string> {
  if (existingEntryId) {
    const row = toFoodFormRow(existingEntryId, draft);
    const query = existingDetails
      ? client.from('food_form_details').update(row).eq('entry_id', existingEntryId)
      : client.from('food_form_details').insert(row);
    const { error } = await query;
    if (error) throw error;
    return existingEntryId;
  }

  const { data: entry, error: entryError } = await client
    .from('patient_entries')
    .insert({ patient_id: patientId, kind: 'daily', occurred_at: occurredAt, text: null })
    .select('id')
    .single<{ id: string }>();
  if (entryError) throw entryError;

  const { error: dailyDetailsError } = await client
    .from('daily_form_details')
    .insert({ entry_id: entry.id });
  if (dailyDetailsError) {
    await client.from('patient_entries').delete().eq('id', entry.id);
    throw dailyDetailsError;
  }

  const { error: foodDetailsError } = await client
    .from('food_form_details')
    .insert(toFoodFormRow(entry.id, draft));
  if (!foodDetailsError) return entry.id;

  await client.from('patient_entries').delete().eq('id', entry.id);
  throw foodDetailsError;
}
