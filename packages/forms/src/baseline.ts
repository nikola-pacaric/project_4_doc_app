import type { PatientSex } from '@project4/contracts';

export interface BaselineProfileDraft {
  birthYear?: number;
  sex?: PatientSex;
  occupation?: string;
  chronicDiseases?: string;
  chronicTherapy?: string;
  menstrualHistory?: string;
  heightCm?: number;
  weightKg?: number;
  recentMajorWeightChange?: 'yes' | 'no';
  recentMajorWeightChangeDescription?: string;
}

export type BaselineProfileField = keyof BaselineProfileDraft;
export type CompleteBaselineProfileDraft = BaselineProfileDraft &
  Required<
    Pick<
      BaselineProfileDraft,
      'sex' | 'birthYear' | 'occupation' | 'weightKg' | 'heightCm' | 'recentMajorWeightChange'
    >
  >;

export interface BaselineValidationResult {
  valid: boolean;
  errors: Partial<Record<BaselineProfileField, 'required' | 'invalid'>>;
}

export const baselineProfileDefaults: BaselineProfileDraft = {
  chronicDiseases: '',
  chronicTherapy: '',
  menstrualHistory: '',
  occupation: '',
  recentMajorWeightChangeDescription: '',
};

export function parseRecentMajorWeightChange(
  storedValue: string | null | undefined,
): Pick<BaselineProfileDraft, 'recentMajorWeightChange' | 'recentMajorWeightChangeDescription'> {
  const value = storedValue?.trim();
  if (!value) {
    return { recentMajorWeightChange: undefined, recentMajorWeightChangeDescription: '' };
  }
  if (/^no$/i.test(value)) {
    return { recentMajorWeightChange: 'no', recentMajorWeightChangeDescription: '' };
  }

  const yesMatch = value.match(/^yes\s*:\s*(.*)$/i);
  return {
    recentMajorWeightChange: 'yes',
    recentMajorWeightChangeDescription: yesMatch?.[1]?.trim() || value,
  };
}

export function formatRecentMajorWeightChange(draft: CompleteBaselineProfileDraft): string {
  return draft.recentMajorWeightChange === 'no'
    ? 'no'
    : `yes: ${draft.recentMajorWeightChangeDescription?.trim() ?? ''}`;
}

export function validateBaselineProfile(
  draft: BaselineProfileDraft,
  currentYear = new Date().getFullYear(),
): BaselineValidationResult {
  const errors: BaselineValidationResult['errors'] = {};

  if (!draft.sex) errors.sex = 'required';
  if (
    !Number.isInteger(draft.birthYear) ||
    draft.birthYear! < 1900 ||
    draft.birthYear! > currentYear
  ) {
    errors.birthYear = draft.birthYear === undefined ? 'required' : 'invalid';
  }
  if (!draft.occupation?.trim()) errors.occupation = 'required';
  if (draft.weightKg === undefined || !Number.isFinite(draft.weightKg)) {
    errors.weightKg = 'required';
  } else if (draft.weightKg <= 0 || draft.weightKg > 500) {
    errors.weightKg = 'invalid';
  }
  if (draft.heightCm === undefined || !Number.isFinite(draft.heightCm)) {
    errors.heightCm = 'required';
  } else if (draft.heightCm < 50 || draft.heightCm > 250) {
    errors.heightCm = 'invalid';
  }
  if (!draft.recentMajorWeightChange) errors.recentMajorWeightChange = 'required';
  if (
    draft.recentMajorWeightChange === 'yes' &&
    !draft.recentMajorWeightChangeDescription?.trim()
  ) {
    errors.recentMajorWeightChangeDescription = 'required';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function isCompleteBaselineProfile(
  draft: BaselineProfileDraft,
): draft is CompleteBaselineProfileDraft {
  return validateBaselineProfile(draft).valid;
}
