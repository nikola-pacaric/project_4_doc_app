import type { PatientBaselineProfile } from '@project4/contracts';
import { formatRecentMajorWeightChange, type CompleteBaselineProfileDraft } from '@project4/forms';

import type { AppSupabaseClient } from './index';

export interface PatientBaselineRow {
  patient_id: string;
  sex: PatientBaselineProfile['sex'];
  birth_year: number | null;
  occupation: string | null;
  chronic_diseases: string | null;
  chronic_therapy: string | null;
  menstrual_history: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  recent_major_weight_change: string | null;
  weight_reminder_due_at: string | null;
  created_at: string;
  updated_at: string;
}

const baselineColumns =
  'patient_id, sex, birth_year, occupation, chronic_diseases, chronic_therapy, menstrual_history, weight_kg, height_cm, recent_major_weight_change, weight_reminder_due_at, created_at, updated_at';

export function toPatientBaselineProfile(row: PatientBaselineRow): PatientBaselineProfile {
  return {
    patientId: row.patient_id,
    sex: row.sex,
    birthYear: row.birth_year,
    occupation: row.occupation,
    chronicDiseases: row.chronic_diseases,
    chronicTherapy: row.chronic_therapy,
    menstrualHistory: row.menstrual_history,
    weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
    heightCm: row.height_cm === null ? null : Number(row.height_cm),
    recentMajorWeightChange: row.recent_major_weight_change,
    weightReminderDueAt: row.weight_reminder_due_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPatientBaseline(
  client: AppSupabaseClient,
  patientId: string,
): Promise<PatientBaselineProfile | null> {
  const { data, error } = await client
    .from('patient_baseline_profiles')
    .select(baselineColumns)
    .eq('patient_id', patientId)
    .maybeSingle<PatientBaselineRow>();

  if (error) throw error;
  return data ? toPatientBaselineProfile(data) : null;
}

function nextWeightReminder(): string {
  const dueAt = new Date();
  dueAt.setMonth(dueAt.getMonth() + 3);
  return dueAt.toISOString();
}

export async function savePatientBaseline(
  client: AppSupabaseClient,
  patientId: string,
  draft: CompleteBaselineProfileDraft,
  current: PatientBaselineProfile | null,
): Promise<PatientBaselineProfile> {
  const weightReminderDueAt =
    current && current.weightKg === draft.weightKg && current.weightReminderDueAt
      ? current.weightReminderDueAt
      : nextWeightReminder();

  const { data, error } = await client
    .from('patient_baseline_profiles')
    .upsert({
      patient_id: patientId,
      sex: draft.sex,
      birth_year: draft.birthYear,
      occupation: draft.occupation.trim(),
      chronic_diseases: draft.chronicDiseases?.trim() ?? '',
      chronic_therapy: draft.chronicTherapy?.trim() ?? '',
      menstrual_history: draft.sex === 'female' ? draft.menstrualHistory?.trim() || null : null,
      weight_kg: draft.weightKg,
      height_cm: draft.heightCm,
      recent_major_weight_change: formatRecentMajorWeightChange(draft),
      weight_reminder_due_at: weightReminderDueAt,
    })
    .select(baselineColumns)
    .single<PatientBaselineRow>();

  if (error) throw error;
  return toPatientBaselineProfile(data);
}
