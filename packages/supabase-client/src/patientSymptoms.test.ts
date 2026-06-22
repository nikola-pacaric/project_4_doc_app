import { describe, expect, it, vi } from 'vitest';

import type { SymptomDraft } from '@project4/forms';

import type { AppSupabaseClient } from './index';
import { savePatientSymptoms, type SymptomSaveRange } from './patientSymptoms';

const range: SymptomSaveRange = {
  start: '2026-06-22T22:00:00.000Z',
  end: '2026-06-23T22:00:00.000Z',
};

const completeSymptom: SymptomDraft = {
  type: 'bloating',
  startedAt: '2026-06-23 08:30',
  endedAt: '',
  intensity: 2,
  modifyingFactors: '  Improved after walking  ',
  wokeFromSleep: false,
};

function createClientMock(data: unknown = 1) {
  const rpc = vi.fn().mockResolvedValue({ data, error: null });
  return { client: { rpc } as unknown as AppSupabaseClient, rpc };
}

describe('savePatientSymptoms', () => {
  it('sends all selected symptoms in one RPC checkpoint', async () => {
    const { client, rpc } = createClientMock(2);

    await savePatientSymptoms(client, range, [
      { ...completeSymptom, entryId: 'entry-1' },
      {
        type: 'pain',
        startedAt: '2026-06-23 10:00',
        endedAt: '2026-06-23 10:30',
        intensity: 3,
        wokeFromSleep: true,
        painLocation: 'lower_abdomen',
        painRadiates: false,
        painDescription: 'cramping',
      },
    ]);

    expect(rpc).toHaveBeenCalledWith('save_patient_symptoms', {
      p_day_start: range.start,
      p_day_end: range.end,
      p_symptoms: [
        expect.objectContaining({
          entry_id: 'entry-1',
          symptom_type: 'bloating',
          modifying_factors: 'Improved after walking',
          ended_at: null,
        }),
        expect.objectContaining({
          entry_id: null,
          symptom_type: 'pain',
          pain_location: 'lower_abdomen',
          pain_radiates: false,
          pain_description: 'cramping',
        }),
      ],
    });
  });

  it('rejects incomplete symptoms before calling Supabase', async () => {
    const { client, rpc } = createClientMock();

    await expect(savePatientSymptoms(client, range, [{ type: 'nausea' }])).rejects.toThrow(
      'Cannot persist incomplete symptom data.',
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects an unexpected RPC count', async () => {
    const { client } = createClientMock(0);
    await expect(savePatientSymptoms(client, range, [completeSymptom])).rejects.toThrow(
      'Symptom save returned an invalid item count.',
    );
  });
});
