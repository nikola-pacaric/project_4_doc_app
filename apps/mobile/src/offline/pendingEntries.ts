import AsyncStorage from '@react-native-async-storage/async-storage';
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

const pendingEntryMutationChains = new Map<string, Promise<void>>();

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

export async function clearPatientOfflineData(patientId: string): Promise<void> {
  await AsyncStorage.multiRemove([...patientOfflineStorageKeys(patientId)]);
}

export async function clearAllPatientOfflineData(): Promise<void> {
  const medicalCacheKeys = filterPatientOfflineStorageKeys(await AsyncStorage.getAllKeys());
  if (medicalCacheKeys.length) {
    await AsyncStorage.multiRemove(medicalCacheKeys);
  }
}

export async function loadPendingEntries(patientId: string): Promise<LocalPendingEntry[]> {
  const key = keyForPatient(patientId);
  const parsed = await loadPatientCacheJson(key);
  if (!Array.isArray(parsed)) {
    if (parsed !== undefined) await discardInvalidPatientCache(key);
    return [];
  }
  return dedupePendingEntries(parsed.filter((entry) => isLocalPendingEntry(entry, patientId)));
}

export async function savePendingEntries(
  patientId: string,
  entries: readonly LocalPendingEntry[],
): Promise<void> {
  await AsyncStorage.setItem(
    keyForPatient(patientId),
    JSON.stringify(entries.filter((entry) => isLocalPendingEntry(entry, patientId))),
  );
}

export async function updatePendingEntries(
  patientId: string,
  updater: (current: readonly LocalPendingEntry[]) => readonly LocalPendingEntry[],
): Promise<LocalPendingEntry[]> {
  const previousMutation = pendingEntryMutationChains.get(patientId) ?? Promise.resolve();
  const mutation = previousMutation.then(async () => {
    const nextEntries = dedupePendingEntries(updater(await loadPendingEntries(patientId)));
    await savePendingEntries(patientId, nextEntries);
    return nextEntries;
  });
  const settledMutation = mutation.then(
    () => undefined,
    () => undefined,
  );
  pendingEntryMutationChains.set(patientId, settledMutation);

  try {
    return await mutation;
  } finally {
    if (pendingEntryMutationChains.get(patientId) === settledMutation) {
      pendingEntryMutationChains.delete(patientId);
    }
  }
}

export async function appendPendingEntry(
  patientId: string,
  entry: LocalPendingEntry,
): Promise<LocalPendingEntry[]> {
  return updatePendingEntries(patientId, (current) => [...current, entry]);
}

export async function loadPendingPhotoDeletions(
  patientId: string,
): Promise<PendingPhotoDeletion[]> {
  const key = photoDeletionKeyForPatient(patientId);
  const parsed = await loadPatientCacheJson(key);
  if (!Array.isArray(parsed)) {
    if (parsed !== undefined) await discardInvalidPatientCache(key);
    return [];
  }
  return dedupePendingPhotoDeletions(parsed.filter(isPendingPhotoDeletion));
}

export async function savePendingPhotoDeletions(
  patientId: string,
  entries: readonly PendingPhotoDeletion[],
): Promise<void> {
  const next = dedupePendingPhotoDeletions(entries);
  const key = photoDeletionKeyForPatient(patientId);
  if (!next.length) {
    await AsyncStorage.removeItem(key);
    return;
  }
  await AsyncStorage.setItem(key, JSON.stringify(next));
}

export async function updatePendingPhotoDeletions(
  patientId: string,
  updater: (current: readonly PendingPhotoDeletion[]) => readonly PendingPhotoDeletion[],
): Promise<PendingPhotoDeletion[]> {
  const next = dedupePendingPhotoDeletions(updater(await loadPendingPhotoDeletions(patientId)));
  await savePendingPhotoDeletions(patientId, next);
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

export async function loadCachedRecentEntries(patientId: string): Promise<PatientEntry[]> {
  const key = cacheKeyForPatient(patientId);
  const parsed = await loadPatientCacheJson(key);
  if (!Array.isArray(parsed)) {
    if (parsed !== undefined) await discardInvalidPatientCache(key);
    return [];
  }
  return parsed.filter((entry) => isPatientEntry(entry, patientId));
}

export async function saveCachedRecentEntries(
  patientId: string,
  entries: readonly PatientEntry[],
): Promise<void> {
  await AsyncStorage.setItem(
    cacheKeyForPatient(patientId),
    JSON.stringify(entries.filter((entry) => isPatientEntry(entry, patientId))),
  );
}

export async function loadCachedOpenedDayEntries(patientId: string): Promise<PatientEntry[]> {
  const cache = await loadOpenedDayEntryCache(patientId);
  return cachedOpenedDayEntries(cache);
}

/**
 * Load cached entries for one local calendar day (YYYY-MM-DD).
 * Prefers the opened-day cache; falls back to filtering the recent-entries cache.
 */
export async function loadCachedEntriesForDay(
  patientId: string,
  day: string,
  getLocalDay: (entry: PatientEntry) => string,
): Promise<PatientEntry[]> {
  const openedDayCache = await loadOpenedDayEntryCache(patientId);
  if (Object.prototype.hasOwnProperty.call(openedDayCache, day)) {
    return openedDayCache[day] ?? [];
  }

  const recent = await loadCachedRecentEntries(patientId);
  return recent.filter((entry) => getLocalDay(entry) === day);
}

export async function saveCachedOpenedDayEntries(
  patientId: string,
  entries: readonly PatientEntry[],
  getLocalDay: (entry: PatientEntry) => string,
  daysToReplace?: readonly string[],
): Promise<void> {
  const currentCache = await loadOpenedDayEntryCache(patientId);
  const patientEntries = entries.filter((entry) => isPatientEntry(entry, patientId));
  const nextCache = daysToReplace
    ? replaceOpenedDayEntryCache(currentCache, patientEntries, getLocalDay, daysToReplace)
    : mergeOpenedDayEntryCache(currentCache, patientEntries, getLocalDay);
  await AsyncStorage.setItem(openedDaysCacheKeyForPatient(patientId), JSON.stringify(nextCache));
}

async function loadOpenedDayEntryCache(patientId: string): Promise<OpenedDayEntryCache> {
  const key = openedDaysCacheKeyForPatient(patientId);
  const parsed = await loadPatientCacheJson(key);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    if (parsed !== undefined) await discardInvalidPatientCache(key);
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
async function loadPatientCacheJson(key: string): Promise<unknown | undefined> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch {
    return undefined;
  }
  if (!raw) return undefined;

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    await discardInvalidPatientCache(key);
    return undefined;
  }
}

async function discardInvalidPatientCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
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
