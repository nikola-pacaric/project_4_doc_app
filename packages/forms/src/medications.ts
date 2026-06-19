export interface MedicationDraft {
  entryId?: string;
  name?: string;
  dose?: string;
  takenAt?: string;
  reason?: string;
  isChronicTherapy?: boolean;
}

export type MedicationField = keyof Omit<MedicationDraft, 'entryId'>;
export type CompleteMedicationDraft = MedicationDraft &
  Required<Omit<MedicationDraft, 'entryId' | 'reason'>>;

export interface MedicationValidationResult {
  valid: boolean;
  errors: Partial<Record<MedicationField, 'required' | 'invalid'>>;
}

export const medicationDraftDefaults: MedicationDraft = { reason: '' };

export function normalizeMedicationDateTime(value: string | undefined): string | null {
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

export function validateMedication(draft: MedicationDraft): MedicationValidationResult {
  const errors: MedicationValidationResult['errors'] = {};

  if (!draft.name?.trim()) errors.name = 'required';
  if (!draft.dose?.trim()) errors.dose = 'required';
  if (!draft.takenAt?.trim()) {
    errors.takenAt = 'required';
  } else if (!normalizeMedicationDateTime(draft.takenAt)) {
    errors.takenAt = 'invalid';
  }
  if (draft.isChronicTherapy === undefined) errors.isChronicTherapy = 'required';

  return { valid: Object.keys(errors).length === 0, errors };
}

export function isCompleteMedicationDraft(
  draft: MedicationDraft,
): draft is CompleteMedicationDraft {
  return validateMedication(draft).valid;
}
