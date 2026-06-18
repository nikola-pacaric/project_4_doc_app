import type { MealType } from '@project4/contracts';

export type { MealType } from '@project4/contracts';

export interface MealDraft {
  entryId?: string;
  type?: MealType;
  name?: string;
  description?: string;
}

export interface MealValidationResult {
  valid: boolean;
  errors: Partial<Record<'type' | 'name', 'required'>>;
}

export const mealDraftDefaults: MealDraft = { description: '' };

export function validateMeal(draft: MealDraft): MealValidationResult {
  const errors: MealValidationResult['errors'] = {};
  if (!draft.type) errors.type = 'required';
  if (!draft.name?.trim()) errors.name = 'required';
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateMeals(drafts: MealDraft[]): boolean {
  return drafts.length > 0 && drafts.every((draft) => validateMeal(draft).valid);
}

export function isMealDraftStarted(draft: MealDraft): boolean {
  return Boolean(draft.entryId || draft.type || draft.name?.trim() || draft.description?.trim());
}

export function getStartedMeals(drafts: MealDraft[]): MealDraft[] {
  return drafts.filter(isMealDraftStarted);
}

export function validateMealProgress(drafts: MealDraft[]): boolean {
  return getStartedMeals(drafts).every((draft) => validateMeal(draft).valid);
}
