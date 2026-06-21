export interface DailyFormDraft {
  wakeTime?: string;
  sleepDuration?: string;
  appetite?: 'low' | 'usual' | 'high';
  hadPhysicalActivity?: boolean;
  activityNotes?: string;
  stressLevel?: 1 | 2 | 3;
  dayDescription?: string;
  tookMedicationOutsideChronicTherapy?: boolean;
  medicationOutsideChronicTherapy?: string;
  hadMenstruation?: boolean;
  menstruationNotes?: string;
  energyLevel?: 1 | 2 | 3;
  hadNaps?: boolean;
  naps?: string;
}

export type DailyFormField = keyof DailyFormDraft;
export type CompleteDailyFormDraft = DailyFormDraft &
  Required<Omit<DailyFormDraft, 'hadMenstruation' | 'menstruationNotes'>>;

export interface DailyFormValidationResult {
  valid: boolean;
  errors: Partial<Record<DailyFormField, 'required' | 'invalid'>>;
}

export const dailyFormDefaults: DailyFormDraft = {
  activityNotes: '',
  dayDescription: '',
  medicationOutsideChronicTherapy: '',
  menstruationNotes: '',
  naps: '',
};

export function hasDailyFormProgress(draft: DailyFormDraft): boolean {
  return Object.values(draft).some((value) => {
    if (typeof value === 'string') return value.trim().length > 0;
    return value !== undefined;
  });
}

const conditionalFields: Array<{
  answer: keyof Pick<
    DailyFormDraft,
    'hadPhysicalActivity' | 'tookMedicationOutsideChronicTherapy' | 'hadNaps'
  >;
  detail: keyof Pick<DailyFormDraft, 'activityNotes' | 'medicationOutsideChronicTherapy' | 'naps'>;
}> = [
  { answer: 'hadPhysicalActivity', detail: 'activityNotes' },
  {
    answer: 'tookMedicationOutsideChronicTherapy',
    detail: 'medicationOutsideChronicTherapy',
  },
  { answer: 'hadNaps', detail: 'naps' },
];

export function validateDailyForm(
  draft: DailyFormDraft,
  includeMenstruation: boolean,
): DailyFormValidationResult {
  const errors: DailyFormValidationResult['errors'] = {};

  if (!draft.wakeTime) {
    errors.wakeTime = 'required';
  } else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.wakeTime)) {
    errors.wakeTime = 'invalid';
  }

  if (!draft.sleepDuration) {
    errors.sleepDuration = 'required';
  } else if (!/^([01]\d|2[0-3]):(00|30)$/.test(draft.sleepDuration)) {
    errors.sleepDuration = 'invalid';
  }

  for (const { answer, detail } of conditionalFields) {
    if (draft[answer] === undefined) {
      errors[answer] = 'required';
    } else if (draft[answer] && !String(draft[detail] ?? '').trim()) {
      errors[detail] = 'required';
    }
  }

  if (!draft.dayDescription?.trim()) errors.dayDescription = 'required';

  if (!draft.appetite) errors.appetite = 'required';
  if (![1, 2, 3].includes(draft.stressLevel ?? 0)) errors.stressLevel = 'required';
  if (![1, 2, 3].includes(draft.energyLevel ?? 0)) errors.energyLevel = 'required';
  if (includeMenstruation) {
    if (draft.hadMenstruation === undefined) {
      errors.hadMenstruation = 'required';
    } else if (draft.hadMenstruation && !draft.menstruationNotes?.trim()) {
      errors.menstruationNotes = 'required';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function isCompleteDailyForm(
  draft: DailyFormDraft,
  includeMenstruation: boolean,
): draft is CompleteDailyFormDraft {
  return validateDailyForm(draft, includeMenstruation).valid;
}
