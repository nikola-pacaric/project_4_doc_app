import type { UserProfile } from '@project4/contracts';
import { patientOfflineStorageKeys } from '@project4/sync';

const patientProfileCacheVersion = 1;

interface CachedPatientProfile {
  profile: UserProfile;
  userId: string;
  version: typeof patientProfileCacheVersion;
}

function cacheKeyForUser(userId: string): string {
  return patientOfflineStorageKeys(userId)[4];
}

/**
 * Persist only the minimum profile state that can safely reopen an already
 * consented patient's locally cached history. It never grants server access.
 */
export function saveCachedOfflinePatientProfile(profile: UserProfile): void {
  if (profile.role !== 'patient' || !isValidConsentTimestamp(profile.consentAcceptedAt)) {
    clearCachedOfflinePatientProfile(profile.id);
    return;
  }

  try {
    window.localStorage.setItem(
      cacheKeyForUser(profile.id),
      JSON.stringify({
        profile,
        userId: profile.id,
        version: patientProfileCacheVersion,
      } satisfies CachedPatientProfile),
    );
  } catch {
    // Storage is best-effort. The normal online profile path remains available.
  }
}

/**
 * Returns a cache entry only when it belongs to the persisted auth session and
 * is still eligible for the patient-only offline experience.
 */
export function loadCachedOfflinePatientProfile(sessionUserId: string): UserProfile | null {
  if (!sessionUserId) return null;

  const key = cacheKeyForUser(sessionUserId);
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const cached = JSON.parse(raw) as unknown;
    if (!isValidCachedPatientProfile(cached, sessionUserId)) {
      clearCachedOfflinePatientProfile(sessionUserId);
      return null;
    }
    return cached.profile;
  } catch {
    clearCachedOfflinePatientProfile(sessionUserId);
    return null;
  }
}

export function clearCachedOfflinePatientProfile(userId: string): void {
  try {
    window.localStorage.removeItem(cacheKeyForUser(userId));
  } catch {
    // A blocked local storage implementation must not block sign-out.
  }
}

function isValidCachedPatientProfile(
  value: unknown,
  sessionUserId: string,
): value is CachedPatientProfile {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CachedPatientProfile>;
  if (
    candidate.version !== patientProfileCacheVersion ||
    candidate.userId !== sessionUserId ||
    !isOfflineEligiblePatientProfile(candidate.profile) ||
    candidate.profile.id !== sessionUserId
  ) {
    return false;
  }

  return true;
}

function isOfflineEligiblePatientProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Partial<UserProfile>;
  return (
    typeof profile.id === 'string' &&
    profile.id.length > 0 &&
    profile.role === 'patient' &&
    (typeof profile.displayName === 'string' || profile.displayName === null) &&
    isValidConsentTimestamp(profile.consentAcceptedAt)
  );
}

function isValidConsentTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}
