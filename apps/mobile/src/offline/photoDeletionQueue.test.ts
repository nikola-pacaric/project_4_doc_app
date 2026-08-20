import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  loadPendingPhotoDeletions,
  savePendingPhotoDeletions,
  updatePendingPhotoDeletions,
} from './pendingEntries';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    removeItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

describe('mobile pending photo deletion queue', () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    vi.clearAllMocks();
    values.clear();
    vi.mocked(AsyncStorage.getItem).mockImplementation(async (key) => values.get(key) ?? null);
    vi.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
      values.set(key, value);
    });
    vi.mocked(AsyncStorage.removeItem).mockImplementation(async (key) => {
      values.delete(key);
    });
  });

  it('round-trips, validates, and deduplicates path-only cleanup targets', async () => {
    const photo = {
      id: 'photo-1',
      photoPath: 'patient/photo.jpg',
      thumbnailPath: 'patient/thumb.jpg',
    };
    const legacyPhoto = { photoPath: 'patient/old.jpg', thumbnailPath: 'patient/old-thumb.jpg' };

    await savePendingPhotoDeletions('patient-1', [photo, { ...photo }]);
    expect(await loadPendingPhotoDeletions('patient-1')).toEqual([photo]);

    values.set(
      'project4:pending-photo-deletions:patient-1',
      JSON.stringify([
        photo,
        legacyPhoto,
        { id: '', photoPath: 'bad', thumbnailPath: 'bad' },
        null,
      ]),
    );
    expect(await loadPendingPhotoDeletions('patient-1')).toEqual([photo, legacyPhoto]);
    expect(
      await updatePendingPhotoDeletions('patient-1', (current) => [...current, photo]),
    ).toEqual([photo, legacyPhoto]);
  });

  it('discards only a malformed patient cleanup queue', async () => {
    values.set('project4:pending-photo-deletions:patient-1', '{');
    values.set('project4:pending-photo-deletions:patient-2', '[]');
    values.set('project4:preferences', 'preserved');

    expect(await loadPendingPhotoDeletions('patient-1')).toEqual([]);
    expect(values.has('project4:pending-photo-deletions:patient-1')).toBe(false);
    expect(values.get('project4:pending-photo-deletions:patient-2')).toBe('[]');
    expect(values.get('project4:preferences')).toBe('preserved');
  });
});
