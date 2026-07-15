import type { PatientEntry } from '@project4/contracts';

export type PendingEntryOperation = 'create_text_entry' | 'update_entry_timestamp' | 'update_note';
export type OpenedDayEntryCache = Record<string, PatientEntry[]>;

export function patientOfflineStorageKeys(patientId: string): readonly [string, string, string] {
  return [
    `project4:pending-entries:${patientId}`,
    `project4:recent-entries:${patientId}`,
    `project4:opened-day-entries:${patientId}`,
  ];
}

export interface PendingTextEntryPayload {
  patientId: string;
  text: string;
  occurredAt: string;
}

export interface PendingTimestampUpdatePayload {
  entryId: string;
  occurredAt: string;
}

export interface PendingNoteUpdatePayload {
  entryId: string;
  text: string;
  occurredAt: string;
}

export interface LocalPendingEntry {
  id: string;
  operation: PendingEntryOperation;
  createdAt: string;
  payload: PendingTextEntryPayload | PendingTimestampUpdatePayload | PendingNoteUpdatePayload;
}

export function hasPendingEntries(entries: readonly LocalPendingEntry[]): boolean {
  return entries.length > 0;
}

export function createPendingTextEntry(
  payload: PendingTextEntryPayload,
  now = new Date(),
): LocalPendingEntry {
  return {
    id: `pending-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    operation: 'create_text_entry',
    createdAt: now.toISOString(),
    payload,
  };
}

export function createPendingTimestampUpdate(
  payload: PendingTimestampUpdatePayload,
  now = new Date(),
): LocalPendingEntry {
  return {
    id: `pending-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    operation: 'update_entry_timestamp',
    createdAt: now.toISOString(),
    payload,
  };
}

export function createPendingNoteUpdate(
  payload: PendingNoteUpdatePayload,
  now = new Date(),
): LocalPendingEntry {
  return {
    id: `pending-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    operation: 'update_note',
    createdAt: now.toISOString(),
    payload,
  };
}

export function isPendingEntryId(entryId: string): boolean {
  return entryId.startsWith('pending-');
}

export function pendingTextEntryToPatientEntry(entry: LocalPendingEntry): PatientEntry | null {
  if (entry.operation !== 'create_text_entry') return null;

  const payload = entry.payload as PendingTextEntryPayload;
  return {
    id: entry.id,
    patientId: payload.patientId,
    kind: 'note',
    occurredAt: payload.occurredAt,
    text: payload.text,
    createdAt: entry.createdAt,
    updatedAt: entry.createdAt,
  };
}

export function pendingTextEntriesToPatientEntries(
  pendingEntries: readonly LocalPendingEntry[],
): PatientEntry[] {
  return pendingEntries.flatMap((entry) => {
    const patientEntry = pendingTextEntryToPatientEntry(entry);
    return patientEntry ? [patientEntry] : [];
  });
}

export function mergePendingTextEntries(
  entries: readonly PatientEntry[],
  pendingEntries: readonly LocalPendingEntry[],
): PatientEntry[] {
  const entryUpdates = new Map<string, Partial<PatientEntry>>();

  for (const pendingEntry of pendingEntries) {
    if (pendingEntry.operation === 'update_entry_timestamp') {
      const payload = pendingEntry.payload as PendingTimestampUpdatePayload;
      entryUpdates.set(payload.entryId, {
        ...entryUpdates.get(payload.entryId),
        occurredAt: payload.occurredAt,
      });
    }

    if (pendingEntry.operation === 'update_note') {
      const payload = pendingEntry.payload as PendingNoteUpdatePayload;
      entryUpdates.set(payload.entryId, {
        ...entryUpdates.get(payload.entryId),
        occurredAt: payload.occurredAt,
        text: payload.text,
      });
    }
  }

  const entriesWithPendingUpdates = entries.map((entry) => {
    const update = entryUpdates.get(entry.id);
    return update ? { ...entry, ...update } : entry;
  });

  return [...pendingTextEntriesToPatientEntries(pendingEntries), ...entriesWithPendingUpdates].sort(
    (left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt),
  );
}

export function pendingTimelineEntryIds(pendingEntries: readonly LocalPendingEntry[]): string[] {
  return pendingEntries.flatMap((entry) => {
    if (entry.operation === 'create_text_entry') return [entry.id];
    const payload = entry.payload as PendingTimestampUpdatePayload | PendingNoteUpdatePayload;
    return [payload.entryId];
  });
}

export function removePendingEntry(
  entries: readonly LocalPendingEntry[],
  entryId: string,
): LocalPendingEntry[] {
  return entries.filter((entry) => entry.id !== entryId);
}

export function dedupePendingEntries(entries: readonly LocalPendingEntry[]): LocalPendingEntry[] {
  const seen = new Set<string>();
  const uniqueEntries: LocalPendingEntry[] = [];

  for (const entry of entries) {
    const key = pendingEntryDedupeKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueEntries.push(entry);
  }

  return uniqueEntries;
}

function pendingEntryDedupeKey(entry: LocalPendingEntry): string {
  if (entry.operation === 'create_text_entry') {
    return [entry.operation, entry.id].join('|');
  }

  if (entry.operation === 'update_note') {
    const payload = entry.payload as PendingNoteUpdatePayload;
    return [entry.operation, payload.entryId, payload.occurredAt, payload.text.trim()].join('|');
  }

  const payload = entry.payload as PendingTimestampUpdatePayload;
  return [entry.operation, payload.entryId, payload.occurredAt].join('|');
}

export function mergeOpenedDayEntryCache(
  currentCache: OpenedDayEntryCache,
  entries: readonly PatientEntry[],
  getLocalDay: (entry: PatientEntry) => string,
  maxDays = 30,
): OpenedDayEntryCache {
  const nextCache: OpenedDayEntryCache = { ...currentCache };

  for (const entry of entries) {
    const day = getLocalDay(entry);
    const entriesForDay = (nextCache[day] ?? []).filter((candidate) => candidate.id !== entry.id);
    nextCache[day] = [...entriesForDay, entry].sort(
      (left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt),
    );
  }

  return limitOpenedDayEntryCache(nextCache, maxDays);
}

export function replaceOpenedDayEntryCache(
  currentCache: OpenedDayEntryCache,
  entries: readonly PatientEntry[],
  getLocalDay: (entry: PatientEntry) => string,
  daysToReplace: readonly string[],
  maxDays = 30,
): OpenedDayEntryCache {
  const nextCache: OpenedDayEntryCache = { ...currentCache };

  for (const day of daysToReplace) {
    delete nextCache[day];
  }

  for (const entry of entries) {
    const day = getLocalDay(entry);
    nextCache[day] = [...(nextCache[day] ?? []), entry].sort(
      (left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt),
    );
  }

  return limitOpenedDayEntryCache(nextCache, maxDays);
}

function limitOpenedDayEntryCache(
  cache: OpenedDayEntryCache,
  maxDays: number,
): OpenedDayEntryCache {
  return Object.fromEntries(
    Object.entries(cache)
      .sort(([leftDay], [rightDay]) => rightDay.localeCompare(leftDay))
      .slice(0, Math.max(1, maxDays)),
  );
}

export function cachedOpenedDayEntries(cache: OpenedDayEntryCache): PatientEntry[] {
  return Object.values(cache)
    .flat()
    .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt));
}
