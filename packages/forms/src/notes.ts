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
