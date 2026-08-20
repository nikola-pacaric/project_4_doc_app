import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPendingTextEntry, patientOfflineStorageKeys } from '@project4/sync';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  appendPendingEntry,
  clearAllPatientOfflineData,
  loadCachedEntriesForDay,
  loadCachedOpenedDayEntries,
  loadCachedRecentEntries,
  loadPendingEntries,
  updatePendingEntries,
} from './pendingEntries';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getAllKeys: vi.fn(),
    getItem: vi.fn(),
    multiRemove: vi.fn(),
    removeItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

describe('clearAllPatientOfflineData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes every medical cache while preserving preferences and auth storage', async () => {
    vi.mocked(AsyncStorage.getAllKeys).mockResolvedValue([
      'project4:preferences',
      'sb-project-auth-token',
      'project4:pending-entries:patient-1',
      'project4:recent-entries:patient-2',
      'project4:pending-photo-deletions:patient-4',
      'project4:opened-day-entries:patient-3',
    ]);
    vi.mocked(AsyncStorage.multiRemove).mockResolvedValue();

    await clearAllPatientOfflineData();

    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
      'project4:pending-entries:patient-1',
      'project4:recent-entries:patient-2',
      'project4:pending-photo-deletions:patient-4',
      'project4:opened-day-entries:patient-3',
    ]);
  });
});

describe('pending-entry mutations', () => {
  let storedQueue: string | null;

  beforeEach(() => {
    vi.clearAllMocks();
    storedQueue = null;
    vi.mocked(AsyncStorage.getItem).mockImplementation(async () => storedQueue);
    vi.mocked(AsyncStorage.setItem).mockImplementation(async (_key, value) => {
      storedQueue = value;
    });
    vi.mocked(AsyncStorage.removeItem).mockResolvedValue();
  });

  it('serializes concurrent appends so neither pending item is lost', async () => {
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

    await Promise.all([
      appendPendingEntry('patient-1', first),
      appendPendingEntry('patient-1', second),
    ]);

    expect(await loadPendingEntries('patient-1')).toEqual([first, second]);
  });

  it('applies concurrent recovery mutations in invocation order', async () => {
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

    await appendPendingEntry('patient-1', first);
    await Promise.all([
      updatePendingEntries('patient-1', (current) => [...current, second]),
      updatePendingEntries('patient-1', (current) =>
        current.filter((entry) => entry.id !== first.id),
      ),
    ]);

    expect(await loadPendingEntries('patient-1')).toEqual([second]);
  });
});

describe('offline cache corruption recovery', () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    vi.clearAllMocks();
    values.clear();
    vi.mocked(AsyncStorage.getItem).mockImplementation(async (key) => values.get(key) ?? null);
    vi.mocked(AsyncStorage.removeItem).mockImplementation(async (key) => {
      values.delete(key);
    });
  });

  it('removes only each corrupted patient cache key and preserves other local data', async () => {
    const [pendingKey, recentKey, openedDayKey] = patientOfflineStorageKeys('patient-1');
    const [otherPendingKey] = patientOfflineStorageKeys('patient-2');
    values.set(pendingKey, '{');
    values.set(recentKey, '[{');
    values.set(openedDayKey, '{"2026-08-19":');
    values.set(otherPendingKey, '[]');
    values.set('project4:preferences', 'preserved');

    expect(await loadPendingEntries('patient-1')).toEqual([]);
    expect(await loadCachedRecentEntries('patient-1')).toEqual([]);
    expect(await loadCachedOpenedDayEntries('patient-1')).toEqual([]);

    expect(values.has(pendingKey)).toBe(false);
    expect(values.has(recentKey)).toBe(false);
    expect(values.has(openedDayKey)).toBe(false);
    expect(values.get(otherPendingKey)).toBe('[]');
    expect(values.get('project4:preferences')).toBe('preserved');
  });

  it('keeps valid entries when a cache array or opened-day cache is partially malformed', async () => {
    const pending = createPendingTextEntry({
      patientId: 'patient-1',
      text: 'Keep this',
      occurredAt: '2026-08-19T08:00:00.000Z',
    });
    const entry = patientEntry();
    const [pendingKey, recentKey, openedDayKey] = patientOfflineStorageKeys('patient-1');
    values.set(pendingKey, JSON.stringify([pending, null, { id: 'invalid' }]));
    values.set(recentKey, JSON.stringify([entry, null, { id: 'invalid' }]));
    values.set(
      openedDayKey,
      JSON.stringify({ '2026-08-19': [entry, null], malformed: 'not-an-array' }),
    );

    expect(await loadPendingEntries('patient-1')).toEqual([pending]);
    expect(await loadCachedRecentEntries('patient-1')).toEqual([entry]);
    expect(await loadCachedOpenedDayEntries('patient-1')).toEqual([entry]);
  });

  it('salvages only entries owned by the requested patient without deleting either cache', async () => {
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
    values.set(
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
    values.set(recentKey, JSON.stringify([ownedEntry, foreignEntry]));
    values.set(openedDayKey, JSON.stringify({ '2026-08-19': [ownedEntry, foreignEntry] }));
    values.set(otherRecentKey, JSON.stringify([foreignEntry]));

    expect(await loadPendingEntries('patient-1')).toEqual([ownedPending]);
    expect(await loadCachedRecentEntries('patient-1')).toEqual([ownedEntry]);
    expect(await loadCachedOpenedDayEntries('patient-1')).toEqual([ownedEntry]);
    expect(values.has(pendingKey)).toBe(true);
    expect(values.has(recentKey)).toBe(true);
    expect(values.has(openedDayKey)).toBe(true);
    expect(values.get(otherRecentKey)).toBe(JSON.stringify([foreignEntry]));
  });

  it('falls back to recent history after discarding a malformed opened-day cache', async () => {
    const entry = patientEntry();
    const [, recentKey, openedDayKey] = patientOfflineStorageKeys('patient-1');
    values.set(recentKey, JSON.stringify([entry]));
    values.set(openedDayKey, '{');

    expect(
      await loadCachedEntriesForDay('patient-1', '2026-08-19', (candidate) =>
        candidate.occurredAt.slice(0, 10),
      ),
    ).toEqual([entry]);
    expect(values.has(openedDayKey)).toBe(false);
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
