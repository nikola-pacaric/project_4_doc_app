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
  const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'stool-entry-1' }, error: null });
  const deleteSelect = vi.fn(() => ({ maybeSingle }));
  const eq = vi.fn(() => ({ select: deleteSelect }));
  const del = vi.fn(() => ({ eq }));
  const photoReturns = vi.fn().mockResolvedValue({ data: [], error: null });
  const photoOrder = vi.fn(() => ({ returns: photoReturns }));
  const photoEq = vi.fn(() => ({ order: photoOrder }));
  const photoSelect = vi.fn(() => ({ eq: photoEq }));
  const from = vi.fn((table: string) =>
    table === 'entry_photos' ? { select: photoSelect } : { delete: del },
  );

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

    const result = await createPatientNote(
      client,
      '00000000-0000-4000-8000-000000000301',
      {
        text: '  Felt better after lunch.  ',
        occurredAt: '2026-06-21T12:30:00.000Z',
      },
      { clientEntryId: 'pending-1752561000000-abc123' },
    );

    expect(rpc).toHaveBeenCalledWith('save_patient_note', {
      p_client_entry_id: 'pending-1752561000000-abc123',
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
      expect.objectContaining({ p_client_entry_id: null, p_entry_id: 'note-entry-1' }),
    );
  });

  it('rejects an idempotency key on note updates before calling Supabase', async () => {
    const { client, rpc } = createClientMock();

    await expect(
      createPatientNote(
        client,
        'patient-1',
        {
          entryId: 'note-entry-1',
          text: 'Updated note',
          occurredAt: '2026-06-21T13:00:00.000Z',
        },
        { clientEntryId: 'pending-1752561000000-abc123' },
      ),
    ).rejects.toThrow('An idempotency key can only be used when creating a note.');
    expect(rpc).not.toHaveBeenCalled();
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
      p_client_entry_id: null,
      p_entry_id: null,
      p_occurred_at: '2026-07-14T10:00:00.000Z',
      p_text: 'No stool today',
    });
  });

  it('updates the previous stool entry in place when converting to no-stool', async () => {
    const { client, rpc } = createClientMock({
      data: {
        id: 'stool-entry-1',
        patient_id: 'patient-1',
        kind: 'note',
        occurred_at: '2026-07-14T10:00:00.000Z',
        text: 'No stool today',
        created_at: '2026-07-14T10:00:00.000Z',
        updated_at: '2026-07-14T10:00:00.000Z',
      },
      error: null,
    });

    await createPatientNoStoolMarker(client, 'patient-1', '2026-07-14T10:00:00.000Z', {
      entryId: 'stool-entry-1',
    });

    expect(rpc).toHaveBeenCalledWith(
      'save_patient_note',
      expect.objectContaining({ p_entry_id: 'stool-entry-1', p_text: 'No stool today' }),
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
