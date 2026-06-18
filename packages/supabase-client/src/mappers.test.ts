import { describe, expect, it } from 'vitest';

import { toPatientEntry } from './patientEntries';
import { toPatientBaselineProfile } from './patientBaseline';
import { toDailyFormDetails } from './patientDailyForms';
import { toUserProfile } from './profiles';

describe('Supabase row mappers', () => {
  it('maps daily form rows and normalizes database time values', () => {
    expect(
      toDailyFormDetails({
        entry_id: 'entry-daily',
        wake_time: '07:15:00',
        food_notes: null,
        appetite: 'usual',
        water_ml: 1800,
        has_other_fluids: true,
        other_fluids: 'Coffee',
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
        has_additional_notes: false,
        notes: 'None',
        completed_at: null,
      }),
    ).toMatchObject({
      entryId: 'entry-daily',
      wakeTime: '07:15',
      sleepDuration: '07:30',
      waterMl: 1800,
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
