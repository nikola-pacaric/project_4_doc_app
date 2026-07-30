import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPendingTextEntry } from '@project4/sync';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  appendPendingEntry,
  clearAllPatientOfflineData,
  loadPendingEntries,
  updatePendingEntries,
} from './pendingEntries';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getAllKeys: vi.fn(),
    getItem: vi.fn(),
    multiRemove: vi.fn(),
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
