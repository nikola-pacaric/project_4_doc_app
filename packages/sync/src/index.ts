export type PendingEntryOperation = 'create_text_entry' | 'update_entry_timestamp';

export interface LocalPendingEntry {
  id: string;
  operation: PendingEntryOperation;
  createdAt: string;
  payload: Record<string, unknown>;
}

export function hasPendingEntries(entries: readonly LocalPendingEntry[]): boolean {
  return entries.length > 0;
}
