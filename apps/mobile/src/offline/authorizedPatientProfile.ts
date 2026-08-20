import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile } from '@project4/contracts';
import { patientOfflineStorageKeys } from '@project4/sync';

const AUTHORIZED_PROFILE_CACHE_VERSION = 1;

interface AuthorizedPatientProfileCacheRecord {
  version: number;
  userId: string;
  cachedAt: number;
  profile: UserProfile;
}

function keyForPatient(patientId: string): string {
  return patientOfflineStorageKeys(patientId)[4];
}

function isAuthorizedPatientProfile(
  value: unknown,
  userId: string,
): value is AuthorizedPatientProfileCacheRecord {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<AuthorizedPatientProfileCacheRecord>;
  const profile = candidate.profile;
  return (
    candidate.version === AUTHORIZED_PROFILE_CACHE_VERSION &&
    candidate.userId === userId &&
    typeof candidate.cachedAt === 'number' &&
    Number.isFinite(candidate.cachedAt) &&
    Boolean(profile) &&
    profile?.id === userId &&
    profile.role === 'patient' &&
    (typeof profile.displayName === 'string' || profile.displayName === null) &&
    typeof profile.consentAcceptedAt === 'string' &&
    Number.isFinite(Date.parse(profile.consentAcceptedAt))
  );
}

export async function clearAuthorizedPatientProfile(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyForPatient(userId));
  } catch {
    // The cache is only an offline convenience and must not interrupt auth recovery.
  }
}

export async function saveAuthorizedPatientProfile(
  userId: string,
  profile: UserProfile,
  now = Date.now(),
): Promise<void> {
  const key = keyForPatient(userId);
  if (
    profile.id !== userId ||
    profile.role !== 'patient' ||
    !profile.consentAcceptedAt ||
    !Number.isFinite(Date.parse(profile.consentAcceptedAt)) ||
    !Number.isFinite(now)
  ) {
    await clearAuthorizedPatientProfile(userId);
    return;
  }

  const record: AuthorizedPatientProfileCacheRecord = {
    version: AUTHORIZED_PROFILE_CACHE_VERSION,
    userId,
    cachedAt: now,
    profile,
  };
  try {
    await AsyncStorage.setItem(key, JSON.stringify(record));
  } catch {
    // The online profile remains authoritative even if its offline cache cannot be written.
  }
}

export async function loadAuthorizedPatientProfile(userId: string): Promise<UserProfile | null> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(keyForPatient(userId));
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isAuthorizedPatientProfile(parsed, userId)) {
      await clearAuthorizedPatientProfile(userId);
      return null;
    }
    return parsed.profile;
  } catch {
    await clearAuthorizedPatientProfile(userId);
    return null;
  }
}
