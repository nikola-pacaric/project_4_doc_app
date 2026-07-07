import { normalizeMealDateTime } from './meals';

export interface FoodHydrationDraft {
  waterLiters?: number;
  hasOtherFluids?: boolean;
  otherFluids?: string;
}

export interface OtherFluidDraft {
  entryId?: string;
  occurredAt?: string;
  name?: string;
}

export type FoodHydrationField = keyof FoodHydrationDraft;
export type CompleteFoodHydrationDraft = FoodHydrationDraft & Required<FoodHydrationDraft>;

export interface FoodHydrationValidationResult {
  valid: boolean;
  errors: Partial<Record<FoodHydrationField, 'required' | 'invalid'>>;
}

export const foodHydrationDefaults: FoodHydrationDraft = { otherFluids: '' };
export const maxFoodWaterLiters = 20;
const otherFluidsStoragePrefix = 'project4:other-fluids:v1:';

export function normalizeFoodWaterLiters(value: number): number {
  return Math.round(value * 100) / 100;
}

function hasAtMostTwoDecimals(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 0.0000001;
}

export function validateFoodHydration(draft: FoodHydrationDraft): FoodHydrationValidationResult {
  const errors: FoodHydrationValidationResult['errors'] = {};

  if (draft.waterLiters === undefined || draft.waterLiters === null) {
    errors.waterLiters = 'required';
  } else if (
    !Number.isFinite(draft.waterLiters) ||
    draft.waterLiters < 0 ||
    draft.waterLiters > maxFoodWaterLiters ||
    !hasAtMostTwoDecimals(draft.waterLiters)
  ) {
    errors.waterLiters = 'invalid';
  }

  if (draft.hasOtherFluids === undefined || draft.hasOtherFluids === null) {
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

export interface MinimalMealDraft {
  type?: string | null;
  name?: string | null;
}

export function isFoodFormComplete(
  hydration: FoodHydrationDraft | null | undefined,
  meals: MinimalMealDraft[],
): boolean {
  if (!hydration) return false;
  if (!validateFoodHydration(hydration).valid) return false;
  if (hydration.hasOtherFluids === true && !hasCompleteOtherFluidDetails(hydration.otherFluids)) {
    return false;
  }
  if (meals.length === 0) return false;
  return meals.every((m) => m.type && m.name?.trim());
}

export function isFoodFormStarted(
  hydration: FoodHydrationDraft | null | undefined,
  meals: readonly unknown[],
): boolean {
  if (meals.length > 0) return true;
  if (!hydration) return false;
  if (hydration.waterLiters !== undefined && hydration.waterLiters !== null) return true;
  if (hydration.hasOtherFluids !== undefined && hydration.hasOtherFluids !== null) return true;
  return false;
}

export function normalizeOtherFluidDateTime(value: string | undefined): string | null {
  return normalizeMealDateTime(value);
}

export function isOtherFluidDraftStarted(draft: OtherFluidDraft): boolean {
  return Boolean(draft.entryId?.trim() || draft.occurredAt?.trim() || draft.name?.trim());
}

export function getStartedOtherFluids(drafts: OtherFluidDraft[]): OtherFluidDraft[] {
  return drafts.filter(isOtherFluidDraftStarted);
}

export function validateOtherFluid(draft: OtherFluidDraft): boolean {
  return Boolean(normalizeOtherFluidDateTime(draft.occurredAt) && draft.name?.trim());
}

export function validateOtherFluidProgress(drafts: OtherFluidDraft[]): boolean {
  return getStartedOtherFluids(drafts).every(validateOtherFluid);
}

export function serializeOtherFluids(drafts: OtherFluidDraft[]): string {
  const startedFluids = getStartedOtherFluids(drafts);
  if (!startedFluids.length) return '';

  const fluids = startedFluids.map((draft) => ({
    entryId: draft.entryId ?? null,
    occurredAt: normalizeOtherFluidDateTime(draft.occurredAt),
    name: draft.name?.trim() ?? '',
  }));

  return `${otherFluidsStoragePrefix}${JSON.stringify(fluids)}`;
}

export function parseOtherFluids(value: string | null | undefined): OtherFluidDraft[] {
  const trimmed = value?.trim();
  if (!trimmed) return [];

  if (!trimmed.startsWith(otherFluidsStoragePrefix)) {
    return [{ name: trimmed }];
  }

  try {
    const parsed = JSON.parse(trimmed.slice(otherFluidsStoragePrefix.length));
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const occurredAt = 'occurredAt' in item ? String(item.occurredAt ?? '') : '';
      const entryId = 'entryId' in item ? String(item.entryId ?? '') : '';
      const name = 'name' in item ? String(item.name ?? '') : '';
      if (!occurredAt && !name && !entryId) return [];
      return [{ ...(entryId ? { entryId } : {}), occurredAt, name }];
    });
  } catch {
    return [];
  }
}

function hasCompleteOtherFluidDetails(value: string | null | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  if (!trimmed.startsWith(otherFluidsStoragePrefix)) return true;

  const fluids = parseOtherFluids(trimmed);
  return fluids.length > 0 && fluids.every(validateOtherFluid);
}

function formatOtherFluidTime(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(
    2,
    '0',
  )}`;
}

export function formatOtherFluidsForDisplay(value: string | null | undefined): string | null {
  const fluids = parseOtherFluids(value)
    .map((fluid) => {
      const name = fluid.name?.trim();
      if (!name) return null;
      const time = formatOtherFluidTime(fluid.occurredAt);
      return time ? `${time} ${name}` : name;
    })
    .filter((fluid): fluid is string => Boolean(fluid));

  return fluids.length ? fluids.join(', ') : null;
}
