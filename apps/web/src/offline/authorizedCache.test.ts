import { filterPatientTimelineEntries, type PatientEntry } from '@project4/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadCachedEntriesForDay, saveCachedOpenedDayEntries } from './pendingEntries';

class MemoryStorage implements Storage {
  readonly #values = new Map<string, string>();

  get length(): number {
    return this.#values.size;
  }

  clear(): void {
    this.#values.clear();
  }

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.#values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.#values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value);
  }
}

function timelineEntries(patientId: string): PatientEntry[] {
  return [
    {
      id: 'entry-note',
      patientId,
      kind: 'note',
      occurredAt: '2026-06-20T08:00:00.000Z',
      text: 'Regular note',
      createdAt: '2026-06-20T08:00:00.000Z',
      updatedAt: '2026-06-20T08:00:00.000Z',
    },
    {
      id: 'entry-fluid',
      patientId,
      kind: 'fluid',
      occurredAt: '2026-06-20T09:00:00.000Z',
      text: 'Water',
      createdAt: '2026-06-20T09:00:00.000Z',
      updatedAt: '2026-06-20T09:00:00.000Z',
    },
    {
      id: 'entry-menstruation',
      patientId,
      kind: 'menstruation',
      occurredAt: '2026-06-20T10:00:00.000Z',
      text: null,
      createdAt: '2026-06-20T10:00:00.000Z',
      updatedAt: '2026-06-20T10:00:00.000Z',
    },
  ];
}

const entryLocalDay = (entry: PatientEntry) => entry.occurredAt.slice(0, 10);

describe('authorized opened-day cache', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('preserves female history offline while excluding menstruation for non-female patients', () => {
    vi.stubGlobal('window', { localStorage: new MemoryStorage() });

    const femaleVisible = filterPatientTimelineEntries(
      timelineEntries('female-patient'),
      'female',
      {
        includeFluidEntries: true,
      },
    );
    saveCachedOpenedDayEntries('female-patient', femaleVisible, entryLocalDay, ['2026-06-20']);
    expect(
      loadCachedEntriesForDay('female-patient', '2026-06-20', entryLocalDay).map(
        (entry) => entry.kind,
      ),
    ).toEqual(['menstruation', 'fluid', 'note']);

    const maleVisible = filterPatientTimelineEntries(timelineEntries('male-patient'), 'male', {
      includeFluidEntries: true,
    });
    saveCachedOpenedDayEntries('male-patient', maleVisible, entryLocalDay, ['2026-06-20']);
    expect(
      loadCachedEntriesForDay('male-patient', '2026-06-20', entryLocalDay).map(
        (entry) => entry.kind,
      ),
    ).toEqual(['fluid', 'note']);
  });
});
