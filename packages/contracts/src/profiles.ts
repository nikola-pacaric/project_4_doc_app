import type { UserRole } from './roles';

export interface UserProfile {
  id: string;
  role: UserRole;
  displayName: string | null;
  consentAcceptedAt: string | null;
}

export type PatientSex = 'female' | 'male' | 'other' | 'prefer_not_to_say';

export interface PatientBaselineProfile {
  patientId: string;
  sex: PatientSex | null;
  birthYear: number | null;
  occupation: string | null;
  chronicDiseases: string | null;
  chronicTherapy: string | null;
  menstrualHistory: string | null;
  weightKg: number | null;
  heightCm: number | null;
  recentMajorWeightChange: string | null;
  weightReminderDueAt: string | null;
  createdAt: string;
  updatedAt: string;
}
