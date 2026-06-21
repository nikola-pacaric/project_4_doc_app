import { describe, expect, it } from 'vitest';

import { toPatientEntry } from './patientEntries';
import { toPatientBaselineProfile } from './patientBaseline';
import { toDailyFormDetails } from './patientDailyForms';
import { toExerciseRecord } from './patientExercises';
import { toFoodFormDetails } from './patientFoodForms';
import { toMedicationRecord } from './patientMedications';
import { toMenstruationRecord } from './patientMenstruation';
import { toSymptomRecord } from './patientSymptoms';
import { toStoolRecord } from './patientStools';
import { toUserProfile } from './profiles';

describe('Supabase row mappers', () => {
  it('maps daily form rows and normalizes database time values', () => {
    expect(
      toDailyFormDetails({
        entry_id: 'entry-daily',
        wake_time: '07:15:00',
        appetite: 'usual',
        had_physical_activity: true,
        activity_notes: 'Walk',
        sleep_notes: '07:30:00',
        stress_level: 2,
        day_description: 'Normal day',
        took_medication_outside_chronic_therapy: false,
        medication_outside_chronic_therapy: 'None',
        had_menstruation: false,
        menstruation_notes: null,
        energy_level: 2,
        had_naps: false,
        naps: 'None',
        completed_at: null,
      }),
    ).toMatchObject({
      entryId: 'entry-daily',
      wakeTime: '07:15',
      sleepDuration: '07:30',
    });
  });

  it('maps food hydration independently from daily details', () => {
    expect(
      toFoodFormDetails({
        entry_id: 'entry-daily',
        water_liters: 1.75,
        has_other_fluids: true,
        other_fluids: 'Coffee',
      }),
    ).toEqual({
      entryId: 'entry-daily',
      waterLiters: 1.75,
      hasOtherFluids: true,
      otherFluids: 'Coffee',
    });
  });

  it('maps numeric baseline values and reminder metadata', () => {
    expect(
      toPatientBaselineProfile({
        patient_id: 'patient-1',
        sex: 'female',
        birth_year: 1988,
        occupation: 'Teacher',
        chronic_diseases: '',
        chronic_therapy: '',
        menstrual_history: 'Regular cycle',
        weight_kg: 68.5,
        height_cm: 172,
        recent_major_weight_change: 'No',
        weight_reminder_due_at: '2026-09-18T08:00:00.000Z',
        created_at: '2026-06-18T08:00:00.000Z',
        updated_at: '2026-06-18T08:00:00.000Z',
      }),
    ).toMatchObject({ patientId: 'patient-1', weightKg: 68.5, heightCm: 172 });
  });

  it('maps structured symptom rows', () => {
    expect(
      toSymptomRecord(
        {
          entry_id: 'entry-symptom',
          symptom_type: 'pain',
          custom_type: null,
          started_at: '2026-06-18T08:30:00.000Z',
          ended_at: null,
          intensity: 3,
          modifying_factors: 'Improved after rest',
          woke_from_sleep: true,
          pain_location: 'upper_abdomen',
          pain_location_custom: null,
          pain_radiates: false,
          pain_radiation: null,
          pain_description: 'burning',
          pain_description_custom: null,
        },
        '2026-06-18T08:30:00.000Z',
      ),
    ).toMatchObject({
      entryId: 'entry-symptom',
      type: 'pain',
      intensity: 3,
      wokeFromSleep: true,
      painDescription: 'burning',
    });
  });

  it('maps structured medication rows', () => {
    expect(
      toMedicationRecord(
        {
          entry_id: 'entry-medication',
          name: 'Vitamin D',
          dose: '1000 IU',
          notes: 'Daily maintenance',
          is_chronic_therapy: true,
        },
        '2026-06-19T10:30:00.000Z',
      ),
    ).toEqual({
      entryId: 'entry-medication',
      occurredAt: '2026-06-19T10:30:00.000Z',
      name: 'Vitamin D',
      dose: '1000 IU',
      reason: 'Daily maintenance',
      isChronicTherapy: true,
    });
  });

  it('maps structured exercise rows', () => {
    expect(
      toExerciseRecord(
        {
          entry_id: 'entry-exercise',
          activity: 'Walking',
          duration_minutes: 30,
          intensity: 'light',
          notes: 'Evening walk',
        },
        '2026-06-20T16:30:00.000Z',
      ),
    ).toEqual({
      entryId: 'entry-exercise',
      occurredAt: '2026-06-20T16:30:00.000Z',
      activity: 'Walking',
      durationMinutes: 30,
      intensity: 'light',
      notes: 'Evening walk',
    });
  });

  it('maps structured menstruation rows', () => {
    expect(
      toMenstruationRecord(
        {
          entry_id: 'entry-menstruation',
          flow: 'moderate',
          pain_level: 2,
          notes: 'Mild cramps',
        },
        '2026-06-20T07:00:00.000Z',
      ),
    ).toEqual({
      entryId: 'entry-menstruation',
      occurredAt: '2026-06-20T07:00:00.000Z',
      flow: 'moderate',
      painLevel: 2,
      notes: 'Mild cramps',
    });
  });

  it('maps structured stool rows', () => {
    expect(
      toStoolRecord(
        {
          entry_id: 'entry-stool',
          bristol_type: 4,
          urgency_level: 'moderate',
          pain: true,
          mucus: false,
          blood: false,
          fatty_stool: false,
          black_stool: false,
          notes: 'Smooth and soft',
        },
        '2026-06-19T16:30:00.000Z',
      ),
    ).toMatchObject({
      entryId: 'entry-stool',
      bristolType: 4,
      urgencyLevel: 'moderate',
      pain: true,
    });
  });

  it('maps patient entry rows to shared contracts', () => {
    expect(
      toPatientEntry({
        id: 'entry-1',
        patient_id: 'patient-1',
        kind: 'text',
        occurred_at: '2026-06-18T08:30:00.000Z',
        text: 'Breakfast felt fine.',
        created_at: '2026-06-18T08:31:00.000Z',
        updated_at: '2026-06-18T08:31:00.000Z',
      }),
    ).toEqual({
      id: 'entry-1',
      patientId: 'patient-1',
      kind: 'text',
      occurredAt: '2026-06-18T08:30:00.000Z',
      text: 'Breakfast felt fine.',
      createdAt: '2026-06-18T08:31:00.000Z',
      updatedAt: '2026-06-18T08:31:00.000Z',
    });
  });

  it('maps profile consent and role data', () => {
    expect(
      toUserProfile({
        id: 'patient-1',
        role: 'patient',
        display_name: 'Ana',
        consent_accepted_at: null,
      }),
    ).toEqual({
      id: 'patient-1',
      role: 'patient',
      displayName: 'Ana',
      consentAcceptedAt: null,
    });
  });
});
