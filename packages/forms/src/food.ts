export interface FoodHydrationDraft {
  waterLiters?: number;
  hasOtherFluids?: boolean;
  otherFluids?: string;
}

export type FoodHydrationField = keyof FoodHydrationDraft;
export type CompleteFoodHydrationDraft = FoodHydrationDraft & Required<FoodHydrationDraft>;

export interface FoodHydrationValidationResult {
  valid: boolean;
  errors: Partial<Record<FoodHydrationField, 'required' | 'invalid'>>;
}

export const foodHydrationDefaults: FoodHydrationDraft = { otherFluids: '' };
export const maxFoodWaterLiters = 20;

export function normalizeFoodWaterLiters(value: number): number {
  return Math.round(value * 100) / 100;
}

function hasAtMostTwoDecimals(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 0.0000001;
}

export function validateFoodHydration(draft: FoodHydrationDraft): FoodHydrationValidationResult {
  const errors: FoodHydrationValidationResult['errors'] = {};

  if (draft.waterLiters === undefined) {
    errors.waterLiters = 'required';
  } else if (
    !Number.isFinite(draft.waterLiters) ||
    draft.waterLiters < 0 ||
    draft.waterLiters > maxFoodWaterLiters ||
    !hasAtMostTwoDecimals(draft.waterLiters)
  ) {
    errors.waterLiters = 'invalid';
  }

  if (draft.hasOtherFluids === undefined) {
    errors.hasOtherFluids = 'required';
  } else if (draft.hasOtherFluids && !draft.otherFluids?.trim()) {
    errors.otherFluids = 'required';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function isCompleteFoodHydrationDraft(
  draft: FoodHydrationDraft,
): draft is CompleteFoodHydrationDraft {
  return validateFoodHydration(draft).valid;
}
