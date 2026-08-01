import type {
  PainDescription,
  PainLocation,
  SymptomIntensity,
  SymptomType,
} from '@project4/contracts';
import { normalizeResearchCalendarDateTime } from '@project4/contracts';

export type {
  PainDescription,
  PainLocation,
  SymptomIntensity,
  SymptomType,
} from '@project4/contracts';

export interface SymptomDraft {
  entryId?: string;
  type?: SymptomType;
  customType?: string;
  startedAt?: string;
  endedAt?: string;
  intensity?: SymptomIntensity;
  modifyingFactors?: string;
  wokeFromSleep?: boolean;
  painLocation?: PainLocation;
  painLocationCustom?: string;
  painRadiates?: boolean;
  painRadiation?: string;
  painDescription?: PainDescription;
  painDescriptionCustom?: string;
}

export type SymptomField = keyof Omit<SymptomDraft, 'entryId'>;
export type SymptomValidationError = 'required' | 'invalid' | 'before_start';

export interface SymptomValidationResult {
  valid: boolean;
  errors: Partial<Record<SymptomField, SymptomValidationError>>;
}

export function createSymptomDraft(type: SymptomType, startedAt: string): SymptomDraft {
  return {
    type,
    customType: '',
    startedAt,
    endedAt: '',
    modifyingFactors: '',
    painLocationCustom: '',
    painRadiation: '',
    painDescriptionCustom: '',
  };
}

export function normalizeSymptomDateTime(value: string | undefined): string | null {
  return normalizeResearchCalendarDateTime(value);
}

export function validateSymptom(draft: SymptomDraft): SymptomValidationResult {
  const errors: SymptomValidationResult['errors'] = {};

  if (!draft.type) errors.type = 'required';
  if (draft.type === 'none') return { valid: Object.keys(errors).length === 0, errors };

  if (draft.type === 'other' && !draft.customType?.trim()) errors.customType = 'required';
  if (![1, 2, 3].includes(draft.intensity ?? 0)) errors.intensity = 'required';
  if (draft.wokeFromSleep === undefined) errors.wokeFromSleep = 'required';

  const startedAt = normalizeSymptomDateTime(draft.startedAt);
  if (!draft.startedAt?.trim()) {
    errors.startedAt = 'required';
  } else if (!startedAt) {
    errors.startedAt = 'invalid';
  }

  const endedAt = normalizeSymptomDateTime(draft.endedAt);
  if (draft.endedAt?.trim() && !endedAt) {
    errors.endedAt = 'invalid';
  } else if (startedAt && endedAt && endedAt < startedAt) {
    errors.endedAt = 'before_start';
  }

  if (draft.type === 'pain') {
    if (!draft.painLocation) errors.painLocation = 'required';
    if (draft.painLocation === 'other' && !draft.painLocationCustom?.trim()) {
      errors.painLocationCustom = 'required';
    }
    if (draft.painRadiates === undefined) errors.painRadiates = 'required';
    if (draft.painRadiates && !draft.painRadiation?.trim()) errors.painRadiation = 'required';
    if (!draft.painDescription) errors.painDescription = 'required';
    if (draft.painDescription === 'other' && !draft.painDescriptionCustom?.trim()) {
      errors.painDescriptionCustom = 'required';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateSymptoms(drafts: SymptomDraft[]): boolean {
  return (
    drafts.length > 0 &&
    drafts.every((draft) => validateSymptom(draft).valid) &&
    (drafts.some((draft) => draft.type === 'none') ? drafts.length === 1 : true)
  );
}
