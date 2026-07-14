import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from './index';
import { listPatientEntriesInRange, listRecentPatientEntries } from './patientEntries';

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
