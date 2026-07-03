import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PatientEntry } from '@project4/contracts';
import {
  cachedOpenedDayEntries,
  dedupePendingEntries,
  mergeOpenedDayEntryCache,
  type LocalPendingEntry,
  type OpenedDayEntryCache,
} from '@project4/sync';

function keyForPatient(patientId: string): string {
  return `project4:pending-entries:${patientId}`;
}

function cacheKeyForPatient(patientId: string): string {
  return `project4:recent-entries:${patientId}`;
}

function openedDaysCacheKeyForPatient(patientId: string): string {
  return `project4:opened-day-entries:${patientId}`;
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

export async function appendPendingEntry(
  patientId: string,
  entry: LocalPendingEntry,
): Promise<LocalPendingEntry[]> {
  const nextEntries = dedupePendingEntries([...(await loadPendingEntries(patientId)), entry]);
  await savePendingEntries(patientId, nextEntries);
  return nextEntries;
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

export async function saveCachedOpenedDayEntries(
  patientId: string,
  entries: readonly PatientEntry[],
  getLocalDay: (entry: PatientEntry) => string,
): Promise<void> {
  const currentCache = await loadOpenedDayEntryCache(patientId);
  const nextCache = mergeOpenedDayEntryCache(currentCache, entries, getLocalDay);
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
