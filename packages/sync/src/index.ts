import type { PatientEntry } from '@project4/contracts';

export type PendingEntryOperation = 'create_text_entry' | 'update_entry_timestamp';

export interface PendingTextEntryPayload {
  patientId: string;
  text: string;
  occurredAt: string;
}

export interface PendingTimestampUpdatePayload {
  entryId: string;
  occurredAt: string;
}

export interface LocalPendingEntry {
  id: string;
  operation: PendingEntryOperation;
  createdAt: string;
  payload: PendingTextEntryPayload | PendingTimestampUpdatePayload;
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
  const timestampUpdates = new Map(
    pendingEntries
      .filter((entry) => entry.operation === 'update_entry_timestamp')
      .map((entry) => {
        const payload = entry.payload as PendingTimestampUpdatePayload;
        return [payload.entryId, payload.occurredAt] as const;
      }),
  );
  const entriesWithPendingTimestamps = entries.map((entry) => {
    const occurredAt = timestampUpdates.get(entry.id);
    return occurredAt ? { ...entry, occurredAt } : entry;
  });

  return [...pendingTextEntriesToPatientEntries(pendingEntries), ...entriesWithPendingTimestamps].sort(
    (left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt),
  );
}

export function pendingTimelineEntryIds(pendingEntries: readonly LocalPendingEntry[]): string[] {
  return pendingEntries.flatMap((entry) => {
    if (entry.operation === 'create_text_entry') return [entry.id];
    const payload = entry.payload as PendingTimestampUpdatePayload;
    return [payload.entryId];
  });
}

export function removePendingEntry(
  entries: readonly LocalPendingEntry[],
  entryId: string,
): LocalPendingEntry[] {
  return entries.filter((entry) => entry.id !== entryId);
}
