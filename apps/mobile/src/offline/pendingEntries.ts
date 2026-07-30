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
  const raw = await AsyncStorage.getItem(keyForPatient(patientId));
  if (!raw) return [];

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return dedupePendingEntries(parsed.filter(isLocalPendingEntry));
}

export async function savePendingEntries(
  patientId: string,
  entries: readonly LocalPendingEntry[],
): Promise<void> {
  await AsyncStorage.setItem(keyForPatient(patientId), JSON.stringify(entries));
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
  const raw = await AsyncStorage.getItem(photoDeletionKeyForPatient(patientId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return dedupePendingPhotoDeletions(parsed.filter(isPendingPhotoDeletion));
  } catch {
    return [];
  }
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
  const raw = await AsyncStorage.getItem(cacheKeyForPatient(patientId));
  if (!raw) return [];

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isPatientEntry);
}

export async function saveCachedRecentEntries(
  patientId: string,
  entries: readonly PatientEntry[],
): Promise<void> {
  await AsyncStorage.setItem(cacheKeyForPatient(patientId), JSON.stringify(entries));
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
  const nextCache = daysToReplace
    ? replaceOpenedDayEntryCache(currentCache, entries, getLocalDay, daysToReplace)
    : mergeOpenedDayEntryCache(currentCache, entries, getLocalDay);
  await AsyncStorage.setItem(openedDaysCacheKeyForPatient(patientId), JSON.stringify(nextCache));
}

async function loadOpenedDayEntryCache(patientId: string): Promise<OpenedDayEntryCache> {
  const raw = await AsyncStorage.getItem(openedDaysCacheKeyForPatient(patientId));
  if (!raw) return {};

  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).flatMap(([day, value]) => {
      if (!Array.isArray(value)) return [];
      return [[day, value.filter(isPatientEntry)]];
    }),
  );
}

function isLocalPendingEntry(value: unknown): value is LocalPendingEntry {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<LocalPendingEntry>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.operation === 'string' &&
    typeof candidate.createdAt === 'string' &&
    Boolean(candidate.payload) &&
    typeof candidate.payload === 'object'
  );
}

function isPatientEntry(value: unknown): value is PatientEntry {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PatientEntry>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.patientId === 'string' &&
    typeof candidate.kind === 'string' &&
    typeof candidate.occurredAt === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    (typeof candidate.text === 'string' || candidate.text === null)
  );
}
