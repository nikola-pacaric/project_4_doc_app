import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from './index';
import { createPatientStool, getPatientStool } from './patientStools';

function createClientMock(
  result: { data: unknown; error: unknown } = { data: 'stool-entry-1', error: null },
) {
  const rpc = vi.fn().mockResolvedValue(result);
  return { client: { rpc } as unknown as AppSupabaseClient, rpc };
}

const completeDraft = {
  bristolType: 4 as const,
  urgencyLevel: 'none' as const,
  pain: false,
  mucus: false,
  blood: false,
  fattyStool: false,
  blackStool: false,
  notes: '  Normal bowel movement  ',
};

describe('createPatientStool', () => {
  it('uses the atomic stool RPC for each new entry', async () => {
    const { client, rpc } = createClientMock();

    await expect(
      createPatientStool(
        client,
        'patient-id-is-not-trusted',
        completeDraft,
        '2026-06-22T08:30:00.000Z',
      ),
    ).resolves.toEqual({
      entryId: 'stool-entry-1',
      occurredAt: '2026-06-22T08:30:00.000Z',
      bristolType: 4,
      urgencyLevel: 'none',
      pain: false,
      mucus: false,
      blood: false,
      fattyStool: false,
      blackStool: false,
      notes: 'Normal bowel movement',
    });

    expect(rpc).toHaveBeenCalledWith('save_patient_stool', {
      p_entry_id: null,
      p_occurred_at: '2026-06-22T08:30:00.000Z',
      p_bristol_type: 4,
      p_urgency_level: 'none',
      p_pain: false,
      p_mucus: false,
      p_blood: false,
      p_fatty_stool: false,
      p_black_stool: false,
      p_notes: 'Normal bowel movement',
    });
  });

  it('sends an existing entry ID when editing', async () => {
    const { client, rpc } = createClientMock();

    await createPatientStool(
      client,
      'patient-1',
      { ...completeDraft, entryId: 'stool-entry-1' },
      '2026-06-22T09:00:00.000Z',
    );

    expect(rpc).toHaveBeenCalledWith(
      'save_patient_stool',
      expect.objectContaining({ p_entry_id: 'stool-entry-1' }),
    );
  });

  it('rejects incomplete drafts before calling Supabase', async () => {
    const { client, rpc } = createClientMock();

    await expect(createPatientStool(client, 'patient-1', { bristolType: 4 })).rejects.toThrow(
      'Cannot persist an incomplete stool draft.',
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects an invalid RPC response', async () => {
    const { client } = createClientMock({ data: null, error: null });

    await expect(createPatientStool(client, 'patient-1', completeDraft)).rejects.toThrow(
      'Stool save returned an invalid entry ID.',
    );
  });
});

describe('getPatientStool', () => {
  it('loads a stool detail row by entry ID', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        entry_id: 'stool-entry-1',
        bristol_type: 4,
        urgency_level: 'none',
        pain: false,
        mucus: false,
        blood: false,
        fatty_stool: false,
        black_stool: false,
        notes: 'Normal',
      },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const client = { from } as unknown as AppSupabaseClient;

    await expect(
      getPatientStool(client, 'stool-entry-1', '2026-06-22T08:30:00.000Z'),
    ).resolves.toEqual({
      entryId: 'stool-entry-1',
      occurredAt: '2026-06-22T08:30:00.000Z',
      bristolType: 4,
      urgencyLevel: 'none',
      pain: false,
      mucus: false,
      blood: false,
      fattyStool: false,
      blackStool: false,
      notes: 'Normal',
    });

    expect(from).toHaveBeenCalledWith('stool_details');
    expect(eq).toHaveBeenCalledWith('entry_id', 'stool-entry-1');
  });
});
