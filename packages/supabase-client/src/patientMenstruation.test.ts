import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from './index';
import { createPatientMenstruation } from './patientMenstruation';

function createClientMock(
  result: { data: unknown; error: unknown } = { data: 'period-entry-1', error: null },
) {
  const rpc = vi.fn().mockResolvedValue(result);
  return { client: { rpc } as unknown as AppSupabaseClient, rpc };
}

const completeDraft = {
  flow: 'moderate' as const,
  painLevel: 2 as const,
  occurredAt: '2026-06-23T08:30:00.000Z',
  notes: '  Mild cramps  ',
};

describe('createPatientMenstruation', () => {
  it('uses the atomic period RPC for each new entry', async () => {
    const { client, rpc } = createClientMock();

    await expect(
      createPatientMenstruation(client, 'patient-id-is-not-trusted', completeDraft),
    ).resolves.toEqual({
      entryId: 'period-entry-1',
      occurredAt: '2026-06-23T08:30:00.000Z',
      flow: 'moderate',
      painLevel: 2,
      notes: 'Mild cramps',
    });

    expect(rpc).toHaveBeenCalledWith('save_patient_menstruation', {
      p_entry_id: null,
      p_occurred_at: '2026-06-23T08:30:00.000Z',
      p_flow: 'moderate',
      p_pain_level: 2,
      p_notes: 'Mild cramps',
    });
  });

  it('sends an existing entry ID when editing', async () => {
    const { client, rpc } = createClientMock();

    await createPatientMenstruation(client, 'patient-1', {
      ...completeDraft,
      entryId: 'period-entry-1',
    });

    expect(rpc).toHaveBeenCalledWith(
      'save_patient_menstruation',
      expect.objectContaining({ p_entry_id: 'period-entry-1' }),
    );
  });

  it('rejects incomplete drafts before calling Supabase', async () => {
    const { client, rpc } = createClientMock();

    await expect(createPatientMenstruation(client, 'patient-1', { flow: 'light' })).rejects.toThrow(
      'Cannot persist an incomplete menstruation draft.',
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects an invalid RPC response', async () => {
    const { client } = createClientMock({ data: null, error: null });

    await expect(createPatientMenstruation(client, 'patient-1', completeDraft)).rejects.toThrow(
      'Period save returned an invalid entry ID.',
    );
  });
});
