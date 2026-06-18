import { describe, expect, it } from 'vitest';

import { toPatientEntry } from './patientEntries';
import { toPatientBaselineProfile } from './patientBaseline';
import { toUserProfile } from './profiles';

describe('Supabase row mappers', () => {
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
