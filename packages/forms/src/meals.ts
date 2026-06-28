import type { MealType } from '@project4/contracts';

export type { MealType } from '@project4/contracts';

export interface MealDraft {
  entryId?: string;
  occurredAt?: string;
  type?: MealType;
  name?: string;
  description?: string;
}

export interface MealValidationResult {
  valid: boolean;
  errors: Partial<Record<'occurredAt' | 'type' | 'name', 'required' | 'invalid'>>;
}

export const mealDraftDefaults: MealDraft = { description: '' };

export function normalizeMealDateTime(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  const localMatch = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(trimmed);

  if (localMatch) {
    const [, yearText, monthText, dayText, hourText, minuteText] = localMatch;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);
    const valid =
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day &&
      parsed.getHours() === hour &&
      parsed.getMinutes() === minute;
    return valid ? parsed.toISOString() : null;
  }

  const timestamp = Date.parse(trimmed);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

export function validateMeal(draft: MealDraft): MealValidationResult {
  const errors: MealValidationResult['errors'] = {};
  if (!draft.occurredAt?.trim()) {
    errors.occurredAt = 'required';
  } else if (!normalizeMealDateTime(draft.occurredAt)) {
    errors.occurredAt = 'invalid';
  }
  if (!draft.type) errors.type = 'required';
  if (!draft.name?.trim()) errors.name = 'required';
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateMeals(drafts: MealDraft[]): boolean {
  return drafts.length > 0 && drafts.every((draft) => validateMeal(draft).valid);
}

export function isMealDraftStarted(draft: MealDraft): boolean {
  return Boolean(
    draft.entryId ||
      draft.type ||
      draft.name?.trim() ||
      draft.description?.trim(),
  );
}

export function getStartedMeals(drafts: MealDraft[]): MealDraft[] {
  return drafts.filter(isMealDraftStarted);
}

export function validateMealProgress(drafts: MealDraft[]): boolean {
  return getStartedMeals(drafts).every((draft) => validateMeal(draft).valid);
}
