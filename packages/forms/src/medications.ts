import { normalizeResearchCalendarDateTime } from '@project4/contracts';

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
  return normalizeResearchCalendarDateTime(value);
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
