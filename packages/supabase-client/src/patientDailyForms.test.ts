import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from './index';
import { savePatientDailyForm } from './patientDailyForms';

function createUpdateClientMock() {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));

  return {
    client: { from } as unknown as AppSupabaseClient,
    update,
  };
}

describe('savePatientDailyForm', () => {
  it('does not convert unanswered chronic-therapy response to false', async () => {
    const { client, update } = createUpdateClientMock();

    await savePatientDailyForm(
      client,
      'patient-1',
      '2026-07-05T10:00:00.000Z',
      {
        wakeTime: '07:00',
        sleepDuration: '08:00',
        tookChronicTherapy: undefined,
      },
      false,
      false,
      'daily-entry-1',
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        took_chronic_therapy: null,
      }),
    );
  });
});
