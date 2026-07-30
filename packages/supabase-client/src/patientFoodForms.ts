import type { FoodFormDetails, FoodFormRecord } from '@project4/contracts';
import {
  formatOtherFluidsForDisplay,
  normalizeOtherFluidDateTime,
  normalizeMealDateTime,
  normalizeFoodWaterLiters,
  type FoodHydrationDraft,
  type MealDraft,
  type OtherFluidDraft,
} from '@project4/forms';

import type { AppSupabaseClient } from './index';
import type { Database } from './database.types';

export type FoodFormRow = Pick<
  Database['public']['Tables']['food_form_details']['Row'],
  'entry_id' | 'water_liters' | 'has_other_fluids' | 'other_fluids'
>;

const foodFormColumns = 'entry_id, water_liters, has_other_fluids, other_fluids';

export type OtherFluidRow = Pick<
  Database['public']['Tables']['other_fluid_details']['Row'],
  'entry_id' | 'daily_entry_id' | 'occurred_at' | 'name'
>;

export interface OtherFluidRecord {
  entryId: string | null;
  dailyEntryId: string;
  occurredAt: string;
  name: string | null;
}

const otherFluidColumns = 'entry_id, daily_entry_id, occurred_at, name';

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
    .maybeSingle();

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

export async function listPatientOtherFluids(
  client: AppSupabaseClient,
  dailyEntryId: string,
): Promise<OtherFluidRecord[]> {
  const { data, error } = await client
    .from('other_fluid_details')
    .select(otherFluidColumns)
    .eq('daily_entry_id', dailyEntryId)
    .order('occurred_at', { ascending: true })
    .returns<OtherFluidRow[]>();

  if (error) throw error;
  return data.map((row) => ({
    entryId: row.entry_id,
    dailyEntryId: row.daily_entry_id,
    occurredAt: row.occurred_at,
    name: row.name,
  }));
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

  if (
    normalizedDraft.waterLiters !== undefined &&
    (!Number.isFinite(normalizedDraft.waterLiters) ||
      normalizedDraft.waterLiters < 0 ||
      normalizedDraft.waterLiters > 20)
  ) {
    throw new Error('Cannot persist invalid food hydration data.');
  }

  if (normalizedDraft.hasOtherFluids === false && normalizedDraft.otherFluids?.trim()) {
    throw new Error('Cannot persist inconsistent other-fluid data.');
  }

  if (!meals.every((meal) => normalizeMealDateTime(meal.occurredAt))) {
    throw new Error('Cannot persist meal data without a valid time.');
  }

  if (normalizedDraft.hasOtherFluids === true) {
    const otherFluids = normalizedDraft.otherFluids?.trim();
    if (otherFluids?.startsWith('project4:other-fluids:v1:')) {
      const parsed = JSON.parse(
        otherFluids.slice('project4:other-fluids:v1:'.length),
      ) as OtherFluidDraft[];
      if (!parsed.every((fluid) => normalizeOtherFluidDateTime(fluid.occurredAt))) {
        throw new Error('Cannot persist fluid data without a valid time.');
      }
    }
  }

  return {
    p_day_start: range.start,
    p_day_end: range.end,
    p_occurred_at: range.occurredAt,
    p_water_liters: normalizedDraft.waterLiters ?? null,
    p_has_other_fluids: normalizedDraft.hasOtherFluids ?? null,
    p_other_fluids:
      normalizedDraft.hasOtherFluids === true ? normalizedDraft.otherFluids?.trim() || null : null,
    p_meals: meals.map((meal) => ({
      entry_id: meal.entryId ?? null,
      occurred_at: normalizeMealDateTime(meal.occurredAt) ?? null,
      meal_type: meal.type ?? null,
      name: meal.name?.trim() || null,
      description: meal.description?.trim() || null,
    })),
  };
}

export async function savePatientFoodForm(
  client: AppSupabaseClient,
  range: FoodFormSaveRange,
  draft: FoodHydrationDraft,
  meals: MealDraft[],
  photoIdsToDelete: readonly string[] = [],
): Promise<string> {
  const { data, error } = await client.rpc('save_patient_food_form_with_photo_cleanup', {
    ...toFoodFormSaveParams(range, draft, meals),
    p_delete_photo_ids: [...new Set(photoIdsToDelete)],
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Food form save returned an invalid entry ID.');
  return data;
}
