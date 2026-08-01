import { normalizeResearchCalendarDateTime } from '@project4/contracts';

export interface NoteDraft {
  entryId?: string;
  text?: string;
  occurredAt?: string;
}

export type NoteField = keyof Omit<NoteDraft, 'entryId'>;
export type CompleteNoteDraft = NoteDraft & Required<Omit<NoteDraft, 'entryId'>>;

export interface NoteValidationResult {
  valid: boolean;
  errors: Partial<Record<NoteField, 'required' | 'invalid'>>;
}

export const noteDraftDefaults: NoteDraft = { text: '' };

export function normalizeNoteDateTime(value: string | undefined): string | null {
  return normalizeResearchCalendarDateTime(value);
}

export function validateNote(draft: NoteDraft): NoteValidationResult {
  const errors: NoteValidationResult['errors'] = {};

  if (!draft.text?.trim()) errors.text = 'required';
  if (!draft.occurredAt?.trim()) {
    errors.occurredAt = 'required';
  } else if (!normalizeNoteDateTime(draft.occurredAt)) {
    errors.occurredAt = 'invalid';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function isCompleteNoteDraft(draft: NoteDraft): draft is CompleteNoteDraft {
  return validateNote(draft).valid;
}
