import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from './index';
import { createPatientNote } from './patientNotes';

function createClientMock() {
  const single = vi.fn().mockResolvedValue({
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
  });
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  const from = vi.fn(() => ({ insert }));

  return {
    client: { from } as unknown as AppSupabaseClient,
    from,
    insert,
  };
}

describe('createPatientNote', () => {
  it('persists a trimmed note with the note entry kind', async () => {
    const { client, from, insert } = createClientMock();

    const result = await createPatientNote(client, '00000000-0000-4000-8000-000000000301', {
      text: '  Felt better after lunch.  ',
      occurredAt: '2026-06-21T12:30:00.000Z',
    });

    expect(from).toHaveBeenCalledWith('patient_entries');
    expect(insert).toHaveBeenCalledWith({
      patient_id: '00000000-0000-4000-8000-000000000301',
      kind: 'note',
      occurred_at: '2026-06-21T12:30:00.000Z',
      text: 'Felt better after lunch.',
    });
    expect(result.kind).toBe('note');
    expect(result.text).toBe('Felt better after lunch.');
  });

  it('rejects incomplete drafts before calling Supabase', async () => {
    const { client, from } = createClientMock();

    await expect(
      createPatientNote(client, '00000000-0000-4000-8000-000000000301', {
        text: '   ',
        occurredAt: '2026-06-21T12:30:00.000Z',
      }),
    ).rejects.toThrow('Cannot persist an incomplete note draft.');
    expect(from).not.toHaveBeenCalled();
  });
});
