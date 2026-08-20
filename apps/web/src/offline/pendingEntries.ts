import type { PatientEntry } from '@project4/contracts';
import {
  cachedOpenedDayEntries,
  dedupePendingPhotoDeletions,
  dedupePendingEntries,
  filterPatientOfflineStorageKeys,
  mergeOpenedDayEntryCache,
  patientOfflineStorageKeys,
  replaceOpenedDayEntryCache,
  type LocalPendingEntry,
  type OpenedDayEntryCache,
  type PendingPhotoDeletion,
} from '@project4/sync';

function keyForPatient(patientId: string): string {
  return patientOfflineStorageKeys(patientId)[0];
}

function cacheKeyForPatient(patientId: string): string {
  return patientOfflineStorageKeys(patientId)[1];
}

function openedDaysCacheKeyForPatient(patientId: string): string {
  return patientOfflineStorageKeys(patientId)[2];
}

function photoDeletionKeyForPatient(patientId: string): string {
  return patientOfflineStorageKeys(patientId)[3];
}

export function clearPatientOfflineData(patientId: string): void {
  for (const key of patientOfflineStorageKeys(patientId)) {
    window.localStorage.removeItem(key);
  }
}

export function clearAllPatientOfflineData(): void {
  const storedKeys = Array.from({ length: window.localStorage.length }, (_, index) =>
    window.localStorage.key(index),
  ).filter((key): key is string => key !== null);

  for (const key of filterPatientOfflineStorageKeys(storedKeys)) {
    window.localStorage.removeItem(key);
  }
}

export function loadPendingEntries(patientId: string): LocalPendingEntry[] {
  const key = keyForPatient(patientId);
  const parsed = loadPatientCacheJson(key);
  if (!Array.isArray(parsed)) {
    if (parsed !== undefined) discardInvalidPatientCache(key);
    return [];
  }
  return dedupePendingEntries(parsed.filter((entry) => isLocalPendingEntry(entry, patientId)));
}

export function savePendingEntries(patientId: string, entries: readonly LocalPendingEntry[]): void {
  window.localStorage.setItem(
    keyForPatient(patientId),
    JSON.stringify(entries.filter((entry) => isLocalPendingEntry(entry, patientId))),
  );
}

export function updatePendingEntries(
  patientId: string,
  updater: (current: readonly LocalPendingEntry[]) => readonly LocalPendingEntry[],
): LocalPendingEntry[] {
  const nextEntries = dedupePendingEntries(updater(loadPendingEntries(patientId)));
  savePendingEntries(patientId, nextEntries);
  return nextEntries;
}

export function appendPendingEntry(
  patientId: string,
  entry: LocalPendingEntry,
): LocalPendingEntry[] {
  return updatePendingEntries(patientId, (current) => [...current, entry]);
}

export function loadPendingPhotoDeletions(patientId: string): PendingPhotoDeletion[] {
  const key = photoDeletionKeyForPatient(patientId);
  const parsed = loadPatientCacheJson(key);
  if (!Array.isArray(parsed)) {
    if (parsed !== undefined) discardInvalidPatientCache(key);
    return [];
  }
  return dedupePendingPhotoDeletions(parsed.filter(isPendingPhotoDeletion));
}

export function savePendingPhotoDeletions(
  patientId: string,
  entries: readonly PendingPhotoDeletion[],
): void {
  const next = dedupePendingPhotoDeletions(entries);
  const key = photoDeletionKeyForPatient(patientId);
  if (!next.length) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(next));
}

export function updatePendingPhotoDeletions(
  patientId: string,
  updater: (current: readonly PendingPhotoDeletion[]) => readonly PendingPhotoDeletion[],
): PendingPhotoDeletion[] {
  const next = dedupePendingPhotoDeletions(updater(loadPendingPhotoDeletions(patientId)));
  savePendingPhotoDeletions(patientId, next);
  return next;
}

function isPendingPhotoDeletion(value: unknown): value is PendingPhotoDeletion {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PendingPhotoDeletion>;
  return (
    (candidate.id === undefined || (typeof candidate.id === 'string' && candidate.id.length > 0)) &&
    typeof candidate.photoPath === 'string' &&
    candidate.photoPath.length > 0 &&
    typeof candidate.thumbnailPath === 'string' &&
    candidate.thumbnailPath.length > 0
  );
}

export function loadCachedRecentEntries(patientId: string): PatientEntry[] {
  const key = cacheKeyForPatient(patientId);
  const parsed = loadPatientCacheJson(key);
  if (!Array.isArray(parsed)) {
    if (parsed !== undefined) discardInvalidPatientCache(key);
    return [];
  }
  return parsed.filter((entry) => isPatientEntry(entry, patientId));
}

export function saveCachedRecentEntries(patientId: string, entries: readonly PatientEntry[]): void {
  window.localStorage.setItem(
    cacheKeyForPatient(patientId),
    JSON.stringify(entries.filter((entry) => isPatientEntry(entry, patientId))),
  );
}

export function loadCachedOpenedDayEntries(patientId: string): PatientEntry[] {
  return cachedOpenedDayEntries(loadOpenedDayEntryCache(patientId));
}

/**
 * Load cached entries for one local calendar day (YYYY-MM-DD).
 * Prefers the opened-day cache; falls back to filtering the recent-entries cache.
 */
export function loadCachedEntriesForDay(
  patientId: string,
  day: string,
  getLocalDay: (entry: PatientEntry) => string,
): PatientEntry[] {
  const openedDayCache = loadOpenedDayEntryCache(patientId);
  if (Object.prototype.hasOwnProperty.call(openedDayCache, day)) {
    return openedDayCache[day] ?? [];
  }

  return loadCachedRecentEntries(patientId).filter((entry) => getLocalDay(entry) === day);
}

export function saveCachedOpenedDayEntries(
  patientId: string,
  entries: readonly PatientEntry[],
  getLocalDay: (entry: PatientEntry) => string,
  daysToReplace?: readonly string[],
): void {
  const currentCache = loadOpenedDayEntryCache(patientId);
  const patientEntries = entries.filter((entry) => isPatientEntry(entry, patientId));
  const nextCache = daysToReplace
    ? replaceOpenedDayEntryCache(currentCache, patientEntries, getLocalDay, daysToReplace)
    : mergeOpenedDayEntryCache(currentCache, patientEntries, getLocalDay);
  window.localStorage.setItem(openedDaysCacheKeyForPatient(patientId), JSON.stringify(nextCache));
}

function loadOpenedDayEntryCache(patientId: string): OpenedDayEntryCache {
  const key = openedDaysCacheKeyForPatient(patientId);
  const parsed = loadPatientCacheJson(key);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    if (parsed !== undefined) discardInvalidPatientCache(key);
    return {};
  }

  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).flatMap(([day, value]) => {
      if (!Array.isArray(value)) return [];
      return [[day, value.filter((entry) => isPatientEntry(entry, patientId))]];
    }),
  );
}

/**
 * Local cache must never prevent the online path or a different patient's
 * cached history from loading. A malformed value is discarded by its exact key.
 */
function loadPatientCacheJson(key: string): unknown | undefined {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return undefined;
  }
  if (!raw) return undefined;

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    discardInvalidPatientCache(key);
    return undefined;
  }
}

function discardInvalidPatientCache(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Cache cleanup is best-effort and must not interrupt recovery.
  }
}

function isLocalPendingEntry(value: unknown, patientId: string): value is LocalPendingEntry {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<LocalPendingEntry>;
  if (
    !isNonEmptyString(candidate.id) ||
    !isNonEmptyString(candidate.createdAt) ||
    (candidate.syncState !== undefined &&
      candidate.syncState !== 'pending' &&
      candidate.syncState !== 'failed') ||
    (candidate.lastError !== undefined && typeof candidate.lastError !== 'string') ||
    !candidate.payload ||
    typeof candidate.payload !== 'object'
  ) {
    return false;
  }

  switch (candidate.operation) {
    case 'create_text_entry': {
      const payload = candidate.payload as unknown as Record<string, unknown>;
      return (
        payload.patientId === patientId &&
        isNonEmptyString(payload.patientId) &&
        typeof payload.text === 'string' &&
        isNonEmptyString(payload.occurredAt)
      );
    }
    case 'update_entry_timestamp': {
      const payload = candidate.payload as unknown as Record<string, unknown>;
      return isNonEmptyString(payload.entryId) && isNonEmptyString(payload.occurredAt);
    }
    case 'update_note': {
      const payload = candidate.payload as unknown as Record<string, unknown>;
      return (
        isNonEmptyString(payload.entryId) &&
        typeof payload.text === 'string' &&
        isNonEmptyString(payload.occurredAt)
      );
    }
    default:
      return false;
  }
}

function isPatientEntry(value: unknown, patientId: string): value is PatientEntry {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PatientEntry>;
  return (
    isNonEmptyString(candidate.id) &&
    candidate.patientId === patientId &&
    isEntryKind(candidate.kind) &&
    isNonEmptyString(candidate.occurredAt) &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    (typeof candidate.text === 'string' || candidate.text === null)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isEntryKind(value: unknown): value is PatientEntry['kind'] {
  return (
    typeof value === 'string' &&
    [
      'text',
      'daily',
      'meal',
      'fluid',
      'symptom',
      'stool',
      'medication',
      'exercise',
      'menstruation',
      'note',
      'custom',
    ].includes(value)
  );
}
