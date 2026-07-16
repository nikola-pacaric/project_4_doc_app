import type {
  DailyFormDetails,
  ExerciseRecord,
  FoodFormDetails,
  MealRecord,
  MedicationRecord,
  MenstruationRecord,
  PatientEntry,
  StoolRecord,
  SymptomRecord,
} from '@project4/contracts';

import type { AppSupabaseClient } from './index';
import type { Database } from './database.types';
import { toPatientEntry, type PatientEntryRow } from './patientEntries';
import { toFoodFormDetails } from './patientFoodForms';

export interface DoctorOtherFluidDetails {
  entryId: string;
  dailyEntryId: string;
  occurredAt: string;
  name: string | null;
}

export interface DoctorSymptomDetails extends SymptomRecord {
  intakeList: string | null;
  qualityOfLifeEffect: string | null;
  customDescription: string | null;
}

export interface DoctorTimelineEntryMedicalDetails {
  daily: DailyFormDetails | null;
  food: FoodFormDetails | null;
  meal: MealRecord | null;
  fluid: DoctorOtherFluidDetails | null;
  symptom: DoctorSymptomDetails | null;
  stool: StoolRecord | null;
  medication: MedicationRecord | null;
  exercise: ExerciseRecord | null;
  menstruation: MenstruationRecord | null;
}

export interface DoctorTimelineEntry extends PatientEntry {
  medicalDetails: DoctorTimelineEntryMedicalDetails;
}

type DailyDetailsRow = Database['public']['Tables']['daily_form_details']['Row'];
type FoodDetailsRow = Database['public']['Tables']['food_form_details']['Row'];
type MealDetailsRow = Database['public']['Tables']['meal_details']['Row'];
type OtherFluidDetailsRow = Database['public']['Tables']['other_fluid_details']['Row'];
type SymptomDetailsRow = Database['public']['Tables']['symptom_details']['Row'];
type StoolDetailsRow = Database['public']['Tables']['stool_details']['Row'];
type MedicationDetailsRow = Database['public']['Tables']['medication_details']['Row'];
type ExerciseDetailsRow = Database['public']['Tables']['exercise_details']['Row'];
type MenstruationDetailsRow = Database['public']['Tables']['menstruation_events']['Row'];

type DoctorTimelineEntryRow = PatientEntryRow & {
  daily_details: DailyDetailsRow | null;
  food_details: FoodDetailsRow | null;
  meal_details: MealDetailsRow | null;
  fluid_details: OtherFluidDetailsRow[];
  symptom_details: SymptomDetailsRow | null;
  stool_details: StoolDetailsRow | null;
  medication_details: MedicationDetailsRow | null;
  exercise_details: ExerciseDetailsRow | null;
  menstruation_details: MenstruationDetailsRow | null;
};

const doctorTimelineColumns = `
  id,
  patient_id,
  kind,
  occurred_at,
  text,
  created_at,
  updated_at,
  daily_details:daily_form_details(
    entry_id,
    wake_time,
    appetite,
    had_physical_activity,
    sleep_notes,
    stress_level,
    day_description,
    took_chronic_therapy,
    took_medication_outside_chronic_therapy,
    medication_outside_chronic_therapy,
    had_menstruation,
    menstruation_notes,
    energy_level,
    had_naps,
    naps,
    completed_at
  ),
  food_details:food_form_details(entry_id, water_liters, has_other_fluids, other_fluids),
  meal_details:meal_details(entry_id, meal_type, name, description),
  fluid_details:other_fluid_details!other_fluid_details_entry_id_fkey(
    entry_id,
    daily_entry_id,
    occurred_at,
    name
  ),
  symptom_details:symptom_details(
    entry_id,
    symptom_type,
    custom_type,
    custom_description,
    intake_list,
    started_at,
    ended_at,
    intensity,
    quality_of_life_effect,
    modifying_factors,
    woke_from_sleep,
    pain_location,
    pain_location_custom,
    pain_radiates,
    pain_radiation,
    pain_description,
    pain_description_custom
  ),
  stool_details:stool_details(
    entry_id,
    bristol_type,
    urgency_level,
    pain,
    mucus,
    blood,
    fatty_stool,
    black_stool,
    notes
  ),
  medication_details:medication_details(entry_id, name, dose, notes, is_chronic_therapy),
  exercise_details:exercise_details(entry_id, activity, duration_minutes, intensity, notes),
  menstruation_details:menstruation_events(entry_id, flow, pain_level, notes)
`;

function toDoctorTimelineEntry(row: DoctorTimelineEntryRow): DoctorTimelineEntry {
  const entry = toPatientEntry(row);
  const daily = row.daily_details;
  const food = row.food_details;
  const meal = row.meal_details;
  const fluid = row.fluid_details[0] ?? null;
  const symptom = row.symptom_details;
  const stool = row.stool_details;
  const medication = row.medication_details;
  const exercise = row.exercise_details;
  const menstruation = row.menstruation_details;

  return {
    ...entry,
    medicalDetails: {
      daily: daily
        ? {
            entryId: daily.entry_id,
            wakeTime: daily.wake_time?.slice(0, 5) ?? null,
            sleepDuration: daily.sleep_notes?.slice(0, 5) ?? null,
            appetite: daily.appetite as DailyFormDetails['appetite'],
            hadPhysicalActivity: daily.had_physical_activity,
            activityNotes: null,
            stressLevel: daily.stress_level as DailyFormDetails['stressLevel'],
            dayDescription: daily.day_description,
            tookChronicTherapy: daily.took_chronic_therapy,
            tookMedicationOutsideChronicTherapy: daily.took_medication_outside_chronic_therapy,
            medicationOutsideChronicTherapy: daily.medication_outside_chronic_therapy,
            hadMenstruation: daily.had_menstruation,
            menstruationNotes: daily.menstruation_notes,
            energyLevel: daily.energy_level as DailyFormDetails['energyLevel'],
            hadNaps: daily.had_naps,
            naps: daily.naps,
            completedAt: daily.completed_at,
          }
        : null,
      food: food ? toFoodFormDetails(food) : null,
      meal: meal
        ? {
            entryId: meal.entry_id,
            occurredAt: entry.occurredAt,
            type: meal.meal_type as MealRecord['type'],
            name: meal.name,
            description: meal.description,
          }
        : null,
      fluid: fluid?.entry_id
        ? {
            entryId: fluid.entry_id,
            dailyEntryId: fluid.daily_entry_id,
            occurredAt: fluid.occurred_at,
            name: fluid.name,
          }
        : null,
      symptom: symptom
        ? {
            entryId: symptom.entry_id,
            occurredAt: entry.occurredAt,
            type: symptom.symptom_type as SymptomRecord['type'],
            customType: symptom.custom_type,
            customDescription: symptom.custom_description,
            intakeList: symptom.intake_list,
            startedAt: symptom.started_at,
            endedAt: symptom.ended_at,
            intensity: symptom.intensity as SymptomRecord['intensity'],
            qualityOfLifeEffect: symptom.quality_of_life_effect,
            modifyingFactors: symptom.modifying_factors,
            wokeFromSleep: symptom.woke_from_sleep,
            painLocation: symptom.pain_location as SymptomRecord['painLocation'],
            painLocationCustom: symptom.pain_location_custom,
            painRadiates: symptom.pain_radiates,
            painRadiation: symptom.pain_radiation,
            painDescription: symptom.pain_description as SymptomRecord['painDescription'],
            painDescriptionCustom: symptom.pain_description_custom,
          }
        : null,
      stool: stool
        ? {
            entryId: stool.entry_id,
            occurredAt: entry.occurredAt,
            bristolType: stool.bristol_type as StoolRecord['bristolType'],
            urgencyLevel: stool.urgency_level as StoolRecord['urgencyLevel'],
            pain: stool.pain,
            mucus: stool.mucus,
            blood: stool.blood,
            fattyStool: stool.fatty_stool,
            blackStool: stool.black_stool,
            notes: stool.notes,
          }
        : null,
      medication: medication
        ? {
            entryId: medication.entry_id,
            occurredAt: entry.occurredAt,
            name: medication.name,
            dose: medication.dose,
            reason: medication.notes,
            isChronicTherapy: medication.is_chronic_therapy,
          }
        : null,
      exercise: exercise
        ? {
            entryId: exercise.entry_id,
            occurredAt: entry.occurredAt,
            activity: exercise.activity,
            durationMinutes: exercise.duration_minutes,
            intensity: exercise.intensity as ExerciseRecord['intensity'],
            notes: exercise.notes,
          }
        : null,
      menstruation: menstruation
        ? {
            entryId: menstruation.entry_id,
            occurredAt: entry.occurredAt,
            flow: menstruation.flow as MenstruationRecord['flow'],
            painLevel: menstruation.pain_level as MenstruationRecord['painLevel'],
            notes: menstruation.notes,
          }
        : null,
    },
  };
}

export async function listDoctorTimelineEntries(
  client: AppSupabaseClient,
  patientId: string,
  days: number,
): Promise<DoctorTimelineEntry[]> {
  const since = new Date();
  since.setDate(since.getDate() - Math.max(1, days));

  const { data, error } = await client
    .from('patient_entries')
    .select(doctorTimelineColumns)
    .eq('patient_id', patientId)
    .gte('occurred_at', since.toISOString())
    .order('occurred_at', { ascending: false })
    .returns<DoctorTimelineEntryRow[]>();

  if (error) throw error;
  return data.map(toDoctorTimelineEntry);
}
