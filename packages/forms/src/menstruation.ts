import {
  menstruationFlows,
  normalizeResearchCalendarDateTime,
  type MenstruationFlow,
  type MenstruationPainLevel,
} from '@project4/contracts';

export type { MenstruationFlow, MenstruationPainLevel } from '@project4/contracts';

export interface MenstruationDraft {
  entryId?: string;
  flow?: MenstruationFlow;
  painLevel?: MenstruationPainLevel;
  occurredAt?: string;
  notes?: string;
}

export type MenstruationField = keyof Omit<MenstruationDraft, 'entryId'>;
export type CompleteMenstruationDraft = MenstruationDraft &
  Required<Omit<MenstruationDraft, 'entryId' | 'notes'>>;

export interface MenstruationValidationResult {
  valid: boolean;
  errors: Partial<Record<MenstruationField, 'required' | 'invalid'>>;
}

export const menstruationDraftDefaults: MenstruationDraft = { notes: '' };

export function normalizeMenstruationDateTime(value: string | undefined): string | null {
  return normalizeResearchCalendarDateTime(value);
}

export function validateMenstruation(draft: MenstruationDraft): MenstruationValidationResult {
  const errors: MenstruationValidationResult['errors'] = {};

  if (!draft.flow) {
    errors.flow = 'required';
  } else if (!menstruationFlows.includes(draft.flow)) {
    errors.flow = 'invalid';
  }
  if (draft.painLevel === undefined) {
    errors.painLevel = 'required';
  } else if (![1, 2, 3].includes(draft.painLevel)) {
    errors.painLevel = 'invalid';
  }
  if (!draft.occurredAt?.trim()) {
    errors.occurredAt = 'required';
  } else if (!normalizeMenstruationDateTime(draft.occurredAt)) {
    errors.occurredAt = 'invalid';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function isCompleteMenstruationDraft(
  draft: MenstruationDraft,
): draft is CompleteMenstruationDraft {
  return validateMenstruation(draft).valid;
}
