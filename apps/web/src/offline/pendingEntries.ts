import type { PatientEntry } from '@project4/contracts';
import {
  cachedOpenedDayEntries,
  dedupePendingEntries,
  filterPatientOfflineStorageKeys,
  mergeOpenedDayEntryCache,
  patientOfflineStorageKeys,
  replaceOpenedDayEntryCache,
  type LocalPendingEntry,
  type OpenedDayEntryCache,
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
  const raw = window.localStorage.getItem(keyForPatient(patientId));
  if (!raw) return [];

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return dedupePendingEntries(parsed.filter(isLocalPendingEntry));
}

export function savePendingEntries(patientId: string, entries: readonly LocalPendingEntry[]): void {
  window.localStorage.setItem(keyForPatient(patientId), JSON.stringify(entries));
}

export function appendPendingEntry(
  patientId: string,
  entry: LocalPendingEntry,
): LocalPendingEntry[] {
  const nextEntries = dedupePendingEntries([...loadPendingEntries(patientId), entry]);
  savePendingEntries(patientId, nextEntries);
  return nextEntries;
}

export function loadCachedRecentEntries(patientId: string): PatientEntry[] {
  const raw = window.localStorage.getItem(cacheKeyForPatient(patientId));
  if (!raw) return [];

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isPatientEntry);
}

export function saveCachedRecentEntries(patientId: string, entries: readonly PatientEntry[]): void {
  window.localStorage.setItem(cacheKeyForPatient(patientId), JSON.stringify(entries));
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
  const nextCache = daysToReplace
    ? replaceOpenedDayEntryCache(currentCache, entries, getLocalDay, daysToReplace)
    : mergeOpenedDayEntryCache(currentCache, entries, getLocalDay);
  window.localStorage.setItem(openedDaysCacheKeyForPatient(patientId), JSON.stringify(nextCache));
}

function loadOpenedDayEntryCache(patientId: string): OpenedDayEntryCache {
  const raw = window.localStorage.getItem(openedDaysCacheKeyForPatient(patientId));
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
