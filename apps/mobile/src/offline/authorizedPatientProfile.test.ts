import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile } from '@project4/contracts';
import { patientOfflineStorageKeys } from '@project4/sync';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearAuthorizedPatientProfile,
  loadAuthorizedPatientProfile,
  saveAuthorizedPatientProfile,
} from './authorizedPatientProfile';
import { clearPatientOfflineData } from './pendingEntries';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    multiRemove: vi.fn(),
    removeItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

const patientProfile: UserProfile = {
  id: 'patient-1',
  role: 'patient',
  displayName: 'Patient One',
  consentAcceptedAt: '2026-08-01T08:00:00.000Z',
};
const now = Date.parse('2026-08-19T12:00:00.000Z');

describe('authorized patient profile cache', () => {
  let values: Map<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    values = new Map();
    vi.mocked(AsyncStorage.getItem).mockImplementation(async (key) => values.get(key) ?? null);
    vi.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
      values.set(key, value);
    });
    vi.mocked(AsyncStorage.removeItem).mockImplementation(async (key) => {
      values.delete(key);
    });
    vi.mocked(AsyncStorage.multiRemove).mockImplementation(async (keys) => {
      keys.forEach((key) => values.delete(key));
    });
  });

  it('restores a consented patient profile for an offline cold start', async () => {
    await saveAuthorizedPatientProfile(patientProfile.id, patientProfile, now);

    await expect(loadAuthorizedPatientProfile(patientProfile.id)).resolves.toEqual(patientProfile);
  });

  it('fails closed and removes a profile whose stored user does not match the persisted session', async () => {
    const key = patientOfflineStorageKeys(patientProfile.id)[4];
    values.set(
      key,
      JSON.stringify({ version: 1, userId: 'patient-2', cachedAt: now, profile: patientProfile }),
    );

    await expect(loadAuthorizedPatientProfile(patientProfile.id)).resolves.toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
  });

  it.each<UserProfile>([
    { ...patientProfile, role: 'doctor' },
    { ...patientProfile, consentAcceptedAt: null },
    { ...patientProfile, consentAcceptedAt: 'not-a-timestamp' },
  ])('does not authorize cached %o profiles', async (unsafeProfile) => {
    const key = patientOfflineStorageKeys(patientProfile.id)[4];
    values.set(
      key,
      JSON.stringify({
        version: 1,
        userId: patientProfile.id,
        cachedAt: now,
        profile: unsafeProfile,
      }),
    );

    await expect(loadAuthorizedPatientProfile(patientProfile.id)).resolves.toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
  });

  it('fails closed and removes corrupt cached data', async () => {
    const key = patientOfflineStorageKeys(patientProfile.id)[4];
    values.set(key, '{corrupt');

    await expect(loadAuthorizedPatientProfile(patientProfile.id)).resolves.toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
  });

  it('fails closed and removes data from an old cache schema', async () => {
    const key = patientOfflineStorageKeys(patientProfile.id)[4];

    values.set(
      key,
      JSON.stringify({
        version: 0,
        userId: patientProfile.id,
        cachedAt: now,
        profile: patientProfile,
      }),
    );
    await expect(loadAuthorizedPatientProfile(patientProfile.id)).resolves.toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
  });

  it('is removed with the existing patient medical cache on account invalidation', async () => {
    await saveAuthorizedPatientProfile(patientProfile.id, patientProfile, now);

    await clearPatientOfflineData(patientProfile.id);

    await expect(loadAuthorizedPatientProfile(patientProfile.id)).resolves.toBeNull();
  });

  it('can be cleared when an online profile lookup confirms no profile exists', async () => {
    await saveAuthorizedPatientProfile(patientProfile.id, patientProfile, now);

    await clearAuthorizedPatientProfile(patientProfile.id);

    await expect(loadAuthorizedPatientProfile(patientProfile.id)).resolves.toBeNull();
  });
});
