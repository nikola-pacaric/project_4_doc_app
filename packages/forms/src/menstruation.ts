import {
  menstruationFlows,
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
