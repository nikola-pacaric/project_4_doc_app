import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from './index';
import { createPatientNoStoolMarker, createPatientNote } from './patientNotes';

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
  options: { includeDelete?: boolean } = {},
) {
  const single = vi.fn().mockResolvedValue({
    data: result.data,
    error: result.error,
  });
  const select = vi.fn(() => ({ single }));
  const rpc = vi.fn(() => ({ select }));
  const eq = vi.fn().mockResolvedValue({ error: null });
  const del = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ delete: del }));

  return {
    client: {
      rpc,
      ...(options.includeDelete ? { from } : {}),
    } as unknown as AppSupabaseClient,
    rpc,
    from,
    del,
    eq,
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

describe('createPatientNoStoolMarker', () => {
  it('creates a no-stool note without replacing another entry', async () => {
    const { client, rpc } = createClientMock({
      data: {
        id: 'no-stool-1',
        patient_id: 'patient-1',
        kind: 'note',
        occurred_at: '2026-07-14T10:00:00.000Z',
        text: 'No stool today',
        created_at: '2026-07-14T10:00:00.000Z',
        updated_at: '2026-07-14T10:00:00.000Z',
      },
      error: null,
    });

    await createPatientNoStoolMarker(client, 'patient-1', '2026-07-14T10:00:00.000Z');

    expect(rpc).toHaveBeenCalledWith('save_patient_note', {
      p_entry_id: null,
      p_occurred_at: '2026-07-14T10:00:00.000Z',
      p_text: 'No stool today',
    });
  });

  it('deletes the previous stool entry when converting to no-stool', async () => {
    const { client, rpc, from, eq } = createClientMock(
      {
        data: {
          id: 'no-stool-2',
          patient_id: 'patient-1',
          kind: 'note',
          occurred_at: '2026-07-14T10:00:00.000Z',
          text: 'No stool today',
          created_at: '2026-07-14T10:00:00.000Z',
          updated_at: '2026-07-14T10:00:00.000Z',
        },
        error: null,
      },
      { includeDelete: true },
    );

    await createPatientNoStoolMarker(client, 'patient-1', '2026-07-14T10:00:00.000Z', {
      replaceEntryId: 'stool-entry-1',
    });

    expect(from).toHaveBeenCalledWith('patient_entries');
    expect(eq).toHaveBeenCalledWith('id', 'stool-entry-1');
    expect(rpc).toHaveBeenCalledWith(
      'save_patient_note',
      expect.objectContaining({ p_entry_id: null, p_text: 'No stool today' }),
    );
  });

  it('updates an existing no-stool note by entry id', async () => {
    const { client, rpc } = createClientMock({
      data: {
        id: 'no-stool-3',
        patient_id: 'patient-1',
        kind: 'note',
        occurred_at: '2026-07-14T11:00:00.000Z',
        text: 'No stool today',
        created_at: '2026-07-14T10:00:00.000Z',
        updated_at: '2026-07-14T11:00:00.000Z',
      },
      error: null,
    });

    await createPatientNoStoolMarker(client, 'patient-1', '2026-07-14T11:00:00.000Z', {
      entryId: 'no-stool-3',
    });

    expect(rpc).toHaveBeenCalledWith(
      'save_patient_note',
      expect.objectContaining({ p_entry_id: 'no-stool-3' }),
    );
  });
});
