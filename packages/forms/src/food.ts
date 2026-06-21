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

export function validateFoodHydration(draft: FoodHydrationDraft): FoodHydrationValidationResult {
  const errors: FoodHydrationValidationResult['errors'] = {};

  if (draft.waterLiters === undefined) {
    errors.waterLiters = 'required';
  } else if (
    !Number.isFinite(draft.waterLiters) ||
    draft.waterLiters < 0 ||
    draft.waterLiters > 20
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
