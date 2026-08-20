import { createPendingTextEntry, patientOfflineStorageKeys } from '@project4/sync';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  appendPendingEntry,
  clearAllPatientOfflineData,
  loadCachedEntriesForDay,
  loadCachedOpenedDayEntries,
  loadCachedRecentEntries,
  loadPendingEntries,
  updatePendingEntries,
} from './pendingEntries';

class MemoryStorage implements Storage {
  readonly #values = new Map<string, string>();

  constructor(keys: readonly string[]) {
    for (const key of keys) {
      this.#values.set(key, 'value');
    }
  }

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

describe('clearAllPatientOfflineData', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('removes every medical cache while preserving preferences and auth storage', () => {
    const localStorage = new MemoryStorage([
      'project4:preferences',
      'sb-project-auth-token',
      'project4:pending-entries:patient-1',
      'project4:recent-entries:patient-2',
      'project4:opened-day-entries:patient-3',
      'project4:pending-photo-deletions:patient-4',
    ]);
    vi.stubGlobal('window', { localStorage });

    clearAllPatientOfflineData();

    expect(localStorage.getItem('project4:pending-entries:patient-1')).toBeNull();
    expect(localStorage.getItem('project4:recent-entries:patient-2')).toBeNull();
    expect(localStorage.getItem('project4:opened-day-entries:patient-3')).toBeNull();
    expect(localStorage.getItem('project4:pending-photo-deletions:patient-4')).toBeNull();
    expect(localStorage.getItem('project4:preferences')).toBe('value');
    expect(localStorage.getItem('sb-project-auth-token')).toBe('value');
  });
});

describe('pending-entry mutations', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('updates the latest persisted queue and deduplicates the result', () => {
    const localStorage = new MemoryStorage([]);
    vi.stubGlobal('window', { localStorage });
    const first = createPendingTextEntry({
      patientId: 'patient-1',
      text: 'First',
      occurredAt: '2026-07-30T08:00:00.000Z',
    });
    const second = createPendingTextEntry({
      patientId: 'patient-1',
      text: 'Second',
      occurredAt: '2026-07-30T09:00:00.000Z',
    });

    appendPendingEntry('patient-1', first);
    const next = updatePendingEntries('patient-1', (current) => [...current, first, second]);

    expect(next).toEqual([first, second]);
    expect(loadPendingEntries('patient-1')).toEqual([first, second]);
  });
});

describe('offline cache corruption recovery', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('removes only each corrupted patient cache key and preserves other local data', () => {
    const localStorage = new MemoryStorage([]);
    vi.stubGlobal('window', { localStorage });
    const [pendingKey, recentKey, openedDayKey] = patientOfflineStorageKeys('patient-1');
    const [otherPendingKey] = patientOfflineStorageKeys('patient-2');
    localStorage.setItem(pendingKey, '{');
    localStorage.setItem(recentKey, '[{');
    localStorage.setItem(openedDayKey, '{"2026-08-19":');
    localStorage.setItem(otherPendingKey, '[]');
    localStorage.setItem('project4:preferences', 'preserved');

    expect(loadPendingEntries('patient-1')).toEqual([]);
    expect(loadCachedRecentEntries('patient-1')).toEqual([]);
    expect(loadCachedOpenedDayEntries('patient-1')).toEqual([]);

    expect(localStorage.getItem(pendingKey)).toBeNull();
    expect(localStorage.getItem(recentKey)).toBeNull();
    expect(localStorage.getItem(openedDayKey)).toBeNull();
    expect(localStorage.getItem(otherPendingKey)).toBe('[]');
    expect(localStorage.getItem('project4:preferences')).toBe('preserved');
  });

  it('keeps valid entries when a cache array or opened-day cache is partially malformed', () => {
    const localStorage = new MemoryStorage([]);
    vi.stubGlobal('window', { localStorage });
    const pending = createPendingTextEntry({
      patientId: 'patient-1',
      text: 'Keep this',
      occurredAt: '2026-08-19T08:00:00.000Z',
    });
    const entry = patientEntry();
    const [pendingKey, recentKey, openedDayKey] = patientOfflineStorageKeys('patient-1');
    localStorage.setItem(pendingKey, JSON.stringify([pending, null, { id: 'invalid' }]));
    localStorage.setItem(recentKey, JSON.stringify([entry, null, { id: 'invalid' }]));
    localStorage.setItem(
      openedDayKey,
      JSON.stringify({ '2026-08-19': [entry, null], malformed: 'not-an-array' }),
    );

    expect(loadPendingEntries('patient-1')).toEqual([pending]);
    expect(loadCachedRecentEntries('patient-1')).toEqual([entry]);
    expect(loadCachedOpenedDayEntries('patient-1')).toEqual([entry]);
  });

  it('salvages only entries owned by the requested patient without deleting either cache', () => {
    const localStorage = new MemoryStorage([]);
    vi.stubGlobal('window', { localStorage });
    const ownedPending = createPendingTextEntry({
      patientId: 'patient-1',
      text: 'Keep this',
      occurredAt: '2026-08-19T08:00:00.000Z',
    });
    const foreignPending = createPendingTextEntry({
      patientId: 'patient-2',
      text: 'Do not expose this',
      occurredAt: '2026-08-19T09:00:00.000Z',
    });
    const ownedEntry = patientEntry();
    const foreignEntry = patientEntry('patient-2', 'entry-2');
    const [pendingKey, recentKey, openedDayKey] = patientOfflineStorageKeys('patient-1');
    const [, otherRecentKey] = patientOfflineStorageKeys('patient-2');
    localStorage.setItem(
      pendingKey,
      JSON.stringify([
        ownedPending,
        foreignPending,
        {
          ...ownedPending,
          operation: 'update_note',
          payload: {
            patientId: 'patient-1',
            text: 'Missing entry id',
            occurredAt: ownedPending.payload.occurredAt,
          },
        },
      ]),
    );
    localStorage.setItem(recentKey, JSON.stringify([ownedEntry, foreignEntry]));
    localStorage.setItem(
      openedDayKey,
      JSON.stringify({ '2026-08-19': [ownedEntry, foreignEntry] }),
    );
    localStorage.setItem(otherRecentKey, JSON.stringify([foreignEntry]));

    expect(loadPendingEntries('patient-1')).toEqual([ownedPending]);
    expect(loadCachedRecentEntries('patient-1')).toEqual([ownedEntry]);
    expect(loadCachedOpenedDayEntries('patient-1')).toEqual([ownedEntry]);
    expect(localStorage.getItem(pendingKey)).not.toBeNull();
    expect(localStorage.getItem(recentKey)).not.toBeNull();
    expect(localStorage.getItem(openedDayKey)).not.toBeNull();
    expect(localStorage.getItem(otherRecentKey)).toBe(JSON.stringify([foreignEntry]));
  });

  it('falls back to recent history after discarding a malformed opened-day cache', () => {
    const localStorage = new MemoryStorage([]);
    vi.stubGlobal('window', { localStorage });
    const entry = patientEntry();
    const [, recentKey, openedDayKey] = patientOfflineStorageKeys('patient-1');
    localStorage.setItem(recentKey, JSON.stringify([entry]));
    localStorage.setItem(openedDayKey, '{');

    expect(
      loadCachedEntriesForDay('patient-1', '2026-08-19', (candidate) =>
        candidate.occurredAt.slice(0, 10),
      ),
    ).toEqual([entry]);
    expect(localStorage.getItem(openedDayKey)).toBeNull();
  });
});

function patientEntry(patientId = 'patient-1', id = 'entry-1') {
  return {
    id,
    patientId,
    kind: 'note',
    occurredAt: '2026-08-19T08:00:00.000Z',
    text: 'Cached entry',
    createdAt: '2026-08-19T08:00:00.000Z',
    updatedAt: '2026-08-19T08:00:00.000Z',
  };
}
