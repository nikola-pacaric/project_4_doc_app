import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from './index';
import {
  deletePatientEntry,
  listPatientEntriesInRange,
  listRecentPatientEntries,
} from './patientEntries';

function createRangeClientMock(rows: unknown[]) {
  const returns = vi.fn().mockResolvedValue({ data: rows, error: null });
  const order = vi.fn(() => ({ returns }));
  const lt = vi.fn(() => ({ order }));
  const gte = vi.fn(() => ({ lt, order }));
  const eq = vi.fn(() => ({ gte }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return {
    client: { from } as unknown as AppSupabaseClient,
    from,
    eq,
    gte,
    lt,
    order,
    returns,
  };
}

describe('listPatientEntriesInRange', () => {
  it('queries patient_entries with a half-open occurred_at range', async () => {
    const rows = [
      {
        id: 'entry-1',
        patient_id: 'patient-1',
        kind: 'note',
        occurred_at: '2026-07-10T10:00:00.000Z',
        text: 'Morning note',
        created_at: '2026-07-10T10:01:00.000Z',
        updated_at: '2026-07-10T10:01:00.000Z',
      },
    ];
    const { client, from, eq, gte, lt, order } = createRangeClientMock(rows);

    const result = await listPatientEntriesInRange(
      client,
      'patient-1',
      '2026-07-10T00:00:00.000Z',
      '2026-07-11T00:00:00.000Z',
    );

    expect(from).toHaveBeenCalledWith('patient_entries');
    expect(eq).toHaveBeenCalledWith('patient_id', 'patient-1');
    expect(gte).toHaveBeenCalledWith('occurred_at', '2026-07-10T00:00:00.000Z');
    expect(lt).toHaveBeenCalledWith('occurred_at', '2026-07-11T00:00:00.000Z');
    expect(order).toHaveBeenCalledWith('occurred_at', { ascending: false });
    expect(result).toEqual([
      {
        id: 'entry-1',
        patientId: 'patient-1',
        kind: 'note',
        occurredAt: '2026-07-10T10:00:00.000Z',
        text: 'Morning note',
        createdAt: '2026-07-10T10:01:00.000Z',
        updatedAt: '2026-07-10T10:01:00.000Z',
      },
    ]);
  });
});

describe('listRecentPatientEntries', () => {
  it('keeps the recent-window query without an upper bound', async () => {
    const returns = vi.fn().mockResolvedValue({ data: [], error: null });
    const order = vi.fn(() => ({ returns }));
    const gte = vi.fn(() => ({ order }));
    const eq = vi.fn(() => ({ gte }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const client = { from } as unknown as AppSupabaseClient;

    await listRecentPatientEntries(client, 'patient-1', 7);

    expect(from).toHaveBeenCalledWith('patient_entries');
    expect(eq).toHaveBeenCalledWith('patient_id', 'patient-1');
    expect(gte).toHaveBeenCalledWith('occurred_at', expect.any(String));
    expect(order).toHaveBeenCalledWith('occurred_at', { ascending: false });
  });
});

describe('deletePatientEntry', () => {
  function createDeleteClientMock(options?: { deleted?: boolean; storageError?: Error | null }) {
    const photoRows = [
      {
        id: 'photo-1',
        entry_id: 'entry-1',
        patient_id: 'patient-1',
        photo_path: 'patients/patient-1/entries/entry-1/photos/photo-1.jpg',
        thumbnail_path: 'patients/patient-1/entries/entry-1/thumbs/photo-1.jpg',
        original_filename: null,
        mime_type: 'image/jpeg',
        width_px: 1200,
        height_px: 900,
        size_bytes: 100,
        thumbnail_size_bytes: 20,
        context_type: 'meal',
        context_label: null,
        created_at: '2026-07-15T10:00:00.000Z',
      },
    ];
    const photoReturns = vi.fn().mockResolvedValue({ data: photoRows, error: null });
    const photoOrder = vi.fn(() => ({ returns: photoReturns }));
    const photoEq = vi.fn(() => ({ order: photoOrder }));
    const photoSelect = vi.fn(() => ({ eq: photoEq }));

    const maybeSingle = vi.fn().mockResolvedValue({
      data: options?.deleted === false ? null : { id: 'entry-1' },
      error: null,
    });
    const deleteSelect = vi.fn(() => ({ maybeSingle }));
    const deleteEq = vi.fn(() => ({ select: deleteSelect }));
    const entryDeleteRows = vi.fn(() => ({ eq: deleteEq }));
    const metadataIn = vi.fn().mockResolvedValue({ error: null });
    const metadataDeleteRows = vi.fn(() => ({ in: metadataIn }));
    const from = vi.fn((table: string) =>
      table === 'entry_photos'
        ? { delete: metadataDeleteRows, select: photoSelect }
        : { delete: entryDeleteRows },
    );

    const remove = vi.fn().mockResolvedValue({
      data: [],
      error: options?.storageError ?? null,
    });
    const storageFrom = vi.fn(() => ({ remove }));

    return {
      client: { from, storage: { from: storageFrom } } as unknown as AppSupabaseClient,
      entryDeleteRows,
      metadataDeleteRows,
      remove,
    };
  }

  it('removes photo objects and metadata before deleting the authorized entry', async () => {
    const { client, entryDeleteRows, metadataDeleteRows, remove } = createDeleteClientMock();

    await expect(deletePatientEntry(client, 'entry-1')).resolves.toEqual({
      photoCleanupPending: false,
    });

    expect(entryDeleteRows).toHaveBeenCalled();
    expect(metadataDeleteRows).toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith([
      'patients/patient-1/entries/entry-1/photos/photo-1.jpg',
      'patients/patient-1/entries/entry-1/thumbs/photo-1.jpg',
    ]);
    expect(remove.mock.invocationCallOrder[0]!).toBeLessThan(
      metadataDeleteRows.mock.invocationCallOrder[0]!,
    );
    expect(metadataDeleteRows.mock.invocationCallOrder[0]!).toBeLessThan(
      entryDeleteRows.mock.invocationCallOrder[0]!,
    );
  });

  it('reports a rejected database deletion after photo cleanup', async () => {
    const { client, remove } = createDeleteClientMock({ deleted: false });

    await expect(deletePatientEntry(client, 'entry-1')).rejects.toThrow('ENTRY_DELETE_NOT_ALLOWED');
    expect(remove).toHaveBeenCalled();
  });

  it('keeps the entry and metadata when storage removal fails', async () => {
    const { client, entryDeleteRows, metadataDeleteRows } = createDeleteClientMock({
      storageError: new Error('storage unavailable'),
    });

    await expect(deletePatientEntry(client, 'entry-1')).rejects.toThrow('storage unavailable');
    expect(metadataDeleteRows).not.toHaveBeenCalled();
    expect(entryDeleteRows).not.toHaveBeenCalled();
  });
});
