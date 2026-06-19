import type { BristolStoolType, StoolUrgencyLevel } from '@project4/contracts';

export type { BristolStoolType, StoolUrgencyLevel } from '@project4/contracts';

export interface StoolDraft {
  entryId?: string;
  bristolType?: BristolStoolType;
  urgencyLevel?: StoolUrgencyLevel;
  pain?: boolean;
  mucus?: boolean;
  blood?: boolean;
  fattyStool?: boolean;
  blackStool?: boolean;
  notes?: string;
}

export type StoolField = keyof Omit<StoolDraft, 'entryId'>;
export type CompleteStoolDraft = StoolDraft & Required<Omit<StoolDraft, 'entryId' | 'notes'>>;

export interface StoolValidationResult {
  valid: boolean;
  errors: Partial<Record<StoolField, 'required' | 'invalid'>>;
}

export const stoolDraftDefaults: StoolDraft = { notes: '' };

const booleanFields = [
  'pain',
  'mucus',
  'blood',
  'fattyStool',
  'blackStool',
] as const satisfies readonly StoolField[];

export function validateStool(draft: StoolDraft): StoolValidationResult {
  const errors: StoolValidationResult['errors'] = {};

  if (draft.bristolType === undefined) {
    errors.bristolType = 'required';
  } else if (
    !Number.isInteger(draft.bristolType) ||
    draft.bristolType < 1 ||
    draft.bristolType > 7
  ) {
    errors.bristolType = 'invalid';
  }

  if (!draft.urgencyLevel) errors.urgencyLevel = 'required';

  for (const field of booleanFields) {
    if (draft[field] === undefined) errors[field] = 'required';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function isCompleteStoolDraft(draft: StoolDraft): draft is CompleteStoolDraft {
  return validateStool(draft).valid;
}
