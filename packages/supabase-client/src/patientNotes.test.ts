import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from './index';
import { createPatientNote } from './patientNotes';

function createClientMock(
  result: {
    data: unknown;
    error: unknown;
  } = {
    data: {
      id: '10000000-0000-4000-8000-000000000301',
      patient_id: '00000000-0000-4000-8000-000000000301',
      kind: 'note',
      occurred_at: '2026-06-21T12:30:00.000Z',
      text: 'Felt better after lunch.',
      created_at: '2026-06-21T12:31:00.000Z',
      updated_at: '2026-06-21T12:31:00.000Z',
    },
    error: null,
  },
) {
  const single = vi.fn().mockResolvedValue({
    data: result.data,
    error: result.error,
  });
  const select = vi.fn(() => ({ single }));
  const rpc = vi.fn(() => ({ select }));

  return {
    client: { rpc } as unknown as AppSupabaseClient,
    rpc,
  };
}

describe('createPatientNote', () => {
  it('uses the atomic note RPC for each new entry', async () => {
    const { client, rpc } = createClientMock();

    const result = await createPatientNote(client, '00000000-0000-4000-8000-000000000301', {
      text: '  Felt better after lunch.  ',
      occurredAt: '2026-06-21T12:30:00.000Z',
    });

    expect(rpc).toHaveBeenCalledWith('save_patient_note', {
      p_entry_id: null,
      p_occurred_at: '2026-06-21T12:30:00.000Z',
      p_text: 'Felt better after lunch.',
    });
    expect(result.kind).toBe('note');
    expect(result.text).toBe('Felt better after lunch.');
  });

  it('sends an existing entry ID when editing', async () => {
    const { client, rpc } = createClientMock();

    await createPatientNote(client, 'patient-1', {
      entryId: 'note-entry-1',
      text: 'Updated note',
      occurredAt: '2026-06-21T13:00:00.000Z',
    });

    expect(rpc).toHaveBeenCalledWith(
      'save_patient_note',
      expect.objectContaining({ p_entry_id: 'note-entry-1' }),
    );
  });

  it('rejects incomplete drafts before calling Supabase', async () => {
    const { client, rpc } = createClientMock();

    await expect(
      createPatientNote(client, '00000000-0000-4000-8000-000000000301', {
        text: '   ',
        occurredAt: '2026-06-21T12:30:00.000Z',
      }),
    ).rejects.toThrow('Cannot persist an incomplete note draft.');
    expect(rpc).not.toHaveBeenCalled();
  });
});
