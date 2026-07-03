import type { PatientEntry } from '@project4/contracts';
import type { LocalPendingEntry } from '@project4/sync';

function keyForPatient(patientId: string): string {
  return `project4:pending-entries:${patientId}`;
}

function cacheKeyForPatient(patientId: string): string {
  return `project4:recent-entries:${patientId}`;
}

export function loadPendingEntries(patientId: string): LocalPendingEntry[] {
  const raw = window.localStorage.getItem(keyForPatient(patientId));
  if (!raw) return [];

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isLocalPendingEntry);
}

export function savePendingEntries(
  patientId: string,
  entries: readonly LocalPendingEntry[],
): void {
  window.localStorage.setItem(keyForPatient(patientId), JSON.stringify(entries));
}

export function appendPendingEntry(patientId: string, entry: LocalPendingEntry): LocalPendingEntry[] {
  const nextEntries = [...loadPendingEntries(patientId), entry];
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

export function saveCachedRecentEntries(
  patientId: string,
  entries: readonly PatientEntry[],
): void {
  window.localStorage.setItem(cacheKeyForPatient(patientId), JSON.stringify(entries));
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
