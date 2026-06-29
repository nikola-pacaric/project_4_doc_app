import type { FoodFormDetails, FoodFormRecord } from '@project4/contracts';
import {
  isCompleteFoodHydrationDraft,
  formatOtherFluidsForDisplay,
  normalizeMealDateTime,
  normalizeFoodWaterLiters,
  validateMeal,
  type FoodHydrationDraft,
  type MealDraft,
} from '@project4/forms';

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
    otherFluidsDisplay: formatOtherFluidsForDisplay(row.other_fluids),
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

export interface FoodFormSaveRange {
  start: string;
  end: string;
  occurredAt: string;
}

function toFoodFormSaveParams(
  range: FoodFormSaveRange,
  draft: FoodHydrationDraft,
  meals: MealDraft[],
) {
  const normalizedDraft: FoodHydrationDraft = {
    ...draft,
    waterLiters:
      draft.waterLiters === undefined ? undefined : normalizeFoodWaterLiters(draft.waterLiters),
  };

  if (!isCompleteFoodHydrationDraft(normalizedDraft)) {
    throw new Error('Cannot persist incomplete food hydration data.');
  }

  if (!meals.every((meal) => validateMeal(meal).valid)) {
    throw new Error('Cannot persist incomplete meal data.');
  }

  return {
    p_day_start: range.start,
    p_day_end: range.end,
    p_occurred_at: range.occurredAt,
    p_water_liters: normalizedDraft.waterLiters,
    p_has_other_fluids: normalizedDraft.hasOtherFluids,
    p_other_fluids: normalizedDraft.hasOtherFluids ? normalizedDraft.otherFluids.trim() : null,
    p_meals: meals.map((meal) => ({
      entry_id: meal.entryId ?? null,
      occurred_at: normalizeMealDateTime(meal.occurredAt) ?? null,
      meal_type: meal.type,
      name: meal.name?.trim(),
      description: meal.description?.trim() || null,
    })),
  };
}

export async function savePatientFoodForm(
  client: AppSupabaseClient,
  range: FoodFormSaveRange,
  draft: FoodHydrationDraft,
  meals: MealDraft[],
): Promise<string> {
  const { data, error } = await client.rpc(
    'save_patient_food_form',
    toFoodFormSaveParams(range, draft, meals),
  );
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Food form save returned an invalid entry ID.');
  return data;
}
