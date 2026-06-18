export interface DailyFormDetails {
  entryId: string;
  wakeTime: string | null;
  sleepDuration: string | null;
  appetite: 'low' | 'usual' | 'high' | null;
  waterMl: number | null;
  hasOtherFluids: boolean | null;
  otherFluids: string | null;
  hadPhysicalActivity: boolean | null;
  activityNotes: string | null;
  stressLevel: 1 | 2 | 3 | null;
  dayDescription: string | null;
  tookMedicationOutsideChronicTherapy: boolean | null;
  medicationOutsideChronicTherapy: string | null;
  hadMenstruation: boolean | null;
  menstruationNotes: string | null;
  energyLevel: 1 | 2 | 3 | null;
  hadNaps: boolean | null;
  naps: string | null;
  hasAdditionalNotes: boolean | null;
  notes: string | null;
  completedAt: string | null;
}

export interface DailyFormRecord {
  entryId: string;
  occurredAt: string;
  details: DailyFormDetails;
}
