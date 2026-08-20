import type { UserProfile } from '@project4/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearAllPatientOfflineData } from './pendingEntries';
import {
  loadCachedOfflinePatientProfile,
  saveCachedOfflinePatientProfile,
} from './patientProfileCache';

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

const acceptedPatient: UserProfile = {
  consentAcceptedAt: '2026-08-01T10:00:00.000Z',
  displayName: 'Patient One',
  id: 'patient-1',
  role: 'patient',
};

function stubStorage(storage = new MemoryStorage()): MemoryStorage {
  vi.stubGlobal('window', { localStorage: storage });
  return storage;
}

describe('offline patient profile cache', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('restores an already-consented patient profile for an offline cold start', () => {
    stubStorage();
    saveCachedOfflinePatientProfile(acceptedPatient);
    const refreshedProfile = { ...acceptedPatient, displayName: 'Updated patient name' };
    saveCachedOfflinePatientProfile(refreshedProfile);

    expect(loadCachedOfflinePatientProfile('patient-1')).toEqual(refreshedProfile);
  });

  it('fails closed when the persisted session belongs to another user', () => {
    const storage = stubStorage();
    saveCachedOfflinePatientProfile(acceptedPatient);

    storage.setItem(
      'project4:authorized-profile:v1:patient-2',
      JSON.stringify({ profile: acceptedPatient, userId: 'patient-2', version: 1 }),
    );

    expect(loadCachedOfflinePatientProfile('patient-2')).toBeNull();
    expect(storage.getItem('project4:authorized-profile:v1:patient-2')).toBeNull();
  });

  it('never caches or restores a doctor profile', () => {
    stubStorage();
    const profileWithDoctorId = { ...acceptedPatient, id: 'doctor-1' };
    saveCachedOfflinePatientProfile(profileWithDoctorId);
    saveCachedOfflinePatientProfile({ ...profileWithDoctorId, role: 'doctor' });

    expect(loadCachedOfflinePatientProfile('doctor-1')).toBeNull();
  });

  it('never caches or restores a profile before consent is accepted', () => {
    stubStorage();
    saveCachedOfflinePatientProfile(acceptedPatient);
    saveCachedOfflinePatientProfile({ ...acceptedPatient, consentAcceptedAt: null });

    expect(loadCachedOfflinePatientProfile('patient-1')).toBeNull();
  });

  it('fails closed and removes a corrupt or stale-schema cache entry', () => {
    const storage = stubStorage();
    const cacheKey = 'project4:authorized-profile:v1:patient-1';
    storage.setItem(cacheKey, '{not-json');

    expect(loadCachedOfflinePatientProfile('patient-1')).toBeNull();
    expect(storage.getItem(cacheKey)).toBeNull();

    storage.setItem(
      cacheKey,
      JSON.stringify({ profile: acceptedPatient, userId: 'patient-1', version: 0 }),
    );
    expect(loadCachedOfflinePatientProfile('patient-1')).toBeNull();
    expect(storage.getItem(cacheKey)).toBeNull();
  });

  it('clears the offline boot profile together with existing medical cache data', () => {
    const storage = stubStorage();
    saveCachedOfflinePatientProfile(acceptedPatient);
    storage.setItem('project4:recent-entries:visible-v1:patient-1', '[]');
    storage.setItem('project4:preferences', 'preserved');

    clearAllPatientOfflineData();

    expect(loadCachedOfflinePatientProfile('patient-1')).toBeNull();
    expect(storage.getItem('project4:recent-entries:visible-v1:patient-1')).toBeNull();
    expect(storage.getItem('project4:preferences')).toBe('preserved');
  });
});
