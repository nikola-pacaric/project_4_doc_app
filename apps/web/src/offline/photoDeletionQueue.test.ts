import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  loadPendingPhotoDeletions,
  savePendingPhotoDeletions,
  updatePendingPhotoDeletions,
} from './pendingEntries';

class MemoryStorage {
  readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe('web pending photo deletion queue', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('round-trips, validates, and deduplicates path-only cleanup targets', () => {
    const storage = new MemoryStorage();
    vi.stubGlobal('window', { localStorage: storage });
    const photo = {
      id: 'photo-1',
      photoPath: 'patient/photo.jpg',
      thumbnailPath: 'patient/thumb.jpg',
    };
    const legacyPhoto = { photoPath: 'patient/old.jpg', thumbnailPath: 'patient/old-thumb.jpg' };

    savePendingPhotoDeletions('patient-1', [photo, { ...photo }]);
    expect(loadPendingPhotoDeletions('patient-1')).toEqual([photo]);

    storage.setItem(
      'project4:pending-photo-deletions:patient-1',
      JSON.stringify([
        photo,
        legacyPhoto,
        { id: '', photoPath: 'bad', thumbnailPath: 'bad' },
        null,
      ]),
    );
    expect(loadPendingPhotoDeletions('patient-1')).toEqual([photo, legacyPhoto]);
    expect(updatePendingPhotoDeletions('patient-1', (current) => [...current, photo])).toEqual([
      photo,
      legacyPhoto,
    ]);
  });

  it('discards only a malformed patient cleanup queue', () => {
    const storage = new MemoryStorage();
    vi.stubGlobal('window', { localStorage: storage });
    storage.setItem('project4:pending-photo-deletions:patient-1', '{');
    storage.setItem('project4:pending-photo-deletions:patient-2', '[]');
    storage.setItem('project4:preferences', 'preserved');

    expect(loadPendingPhotoDeletions('patient-1')).toEqual([]);
    expect(storage.getItem('project4:pending-photo-deletions:patient-1')).toBeNull();
    expect(storage.getItem('project4:pending-photo-deletions:patient-2')).toBe('[]');
    expect(storage.getItem('project4:preferences')).toBe('preserved');
  });
});
