import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from './index';
import { savePatientBaseline } from './patientBaseline';

function createBaselineClientMock() {
  const single = vi.fn().mockResolvedValue({
    data: {
      patient_id: 'patient-1',
      sex: 'female',
      birth_year: 1988,
      occupation: 'Teacher',
      chronic_diseases: null,
      chronic_therapy: null,
      menstrual_history: null,
      weight_kg: 68,
      height_cm: 172,
      recent_major_weight_change: 'no',
      weight_reminder_due_at: '2026-10-05T10:00:00.000Z',
      created_at: '2026-07-05T10:00:00.000Z',
      updated_at: '2026-07-05T10:00:00.000Z',
    },
    error: null,
  });
  const select = vi.fn(() => ({ single }));
  const upsert = vi.fn(() => ({ select }));
  const from = vi.fn(() => ({ upsert }));

  return {
    client: { from } as unknown as AppSupabaseClient,
    upsert,
  };
}

describe('savePatientBaseline', () => {
  it('stores blank optional text fields as null rather than empty-string answers', async () => {
    const { client, upsert } = createBaselineClientMock();

    await savePatientBaseline(
      client,
      'patient-1',
      {
        sex: 'female',
        birthYear: 1988,
        occupation: 'Teacher',
        chronicDiseases: '',
        chronicTherapy: '',
        menstrualHistory: '',
        weightKg: 68,
        heightCm: 172,
        recentMajorWeightChange: 'no',
      },
      null,
    );

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        chronic_diseases: null,
        chronic_therapy: null,
        menstrual_history: null,
      }),
    );
  });
});
