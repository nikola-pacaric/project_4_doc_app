import type { DailyFormDetails } from '@project4/contracts';
import { t, type Locale, type TranslationKey } from '@project4/i18n';

import {
  dailyFormDefaults,
  validateDailyForm,
  type DailyFormDraft,
  type DailyFormField,
} from './daily';

const dailyFieldOrder: DailyFormField[] = [
  'wakeTime',
  'sleepDuration',
  'appetite',
  'hadPhysicalActivity',
  'stressLevel',
  'energyLevel',
  'tookChronicTherapy',
  'tookMedicationOutsideChronicTherapy',
  'hadMenstruation',
  'hadNaps',
  'naps',
  'dayDescription',
];

const dailyFieldLabelKeys: Record<DailyFormField, TranslationKey> = {
  wakeTime: 'daily.wakeTime',
  sleepDuration: 'daily.sleepDuration',
  appetite: 'daily.appetite',
  hadPhysicalActivity: 'daily.activityNotes',
  activityNotes: 'daily.activityDetails',
  stressLevel: 'daily.stressLevel',
  dayDescription: 'daily.dayDescription',
  tookChronicTherapy: 'daily.chronicTherapyTaken',
  tookMedicationOutsideChronicTherapy: 'daily.medication',
  medicationOutsideChronicTherapy: 'daily.medicationDetails',
  hadMenstruation: 'daily.menstruation',
  menstruationNotes: 'daily.menstruationDetails',
  energyLevel: 'daily.energyLevel',
  hadNaps: 'daily.naps',
  naps: 'daily.napsDetails',
};

export function toDailyFormDraft(details: DailyFormDetails | null): DailyFormDraft {
  if (!details) return { ...dailyFormDefaults };
  return {
    wakeTime: details.wakeTime ?? undefined,
    sleepDuration: details.sleepDuration ?? undefined,
    appetite: details.appetite ?? undefined,
    hadPhysicalActivity: details.hadPhysicalActivity ?? undefined,
    activityNotes: details.activityNotes ?? undefined,
    stressLevel: details.stressLevel ?? undefined,
    dayDescription: details.dayDescription ?? undefined,
    tookChronicTherapy: details.tookChronicTherapy ?? undefined,
    tookMedicationOutsideChronicTherapy:
      details.tookMedicationOutsideChronicTherapy ?? undefined,
    medicationOutsideChronicTherapy: details.medicationOutsideChronicTherapy ?? undefined,
    hadMenstruation: details.hadMenstruation ?? undefined,
    menstruationNotes: details.menstruationNotes ?? undefined,
    energyLevel: details.energyLevel ?? undefined,
    hadNaps: details.hadNaps ?? undefined,
    naps: details.naps ?? undefined,
  };
}

export function getDailyFormMissingFields(
  draft: DailyFormDraft,
  includeMenstruation: boolean,
  hasChronicTherapy: boolean,
): DailyFormField[] {
  const { errors } = validateDailyForm(draft, includeMenstruation, hasChronicTherapy);
  return dailyFieldOrder.filter((field) => errors[field]);
}

export function formatDailyFormMissingFields(locale: Locale, fields: DailyFormField[]): string {
  const labels = fields.map((field) => t(locale, dailyFieldLabelKeys[field]));
  return t(locale, 'daily.missingFields').replace('{fields}', labels.join(', '));
}
