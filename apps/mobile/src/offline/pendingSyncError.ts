import {
  isPendingEntryRetryable,
  type LocalPendingEntry,
  type PendingEntryOperation,
} from '@project4/sync';

export type PendingSyncErrorKey = 'entry.saveError' | 'entry.updateError';

export function pendingSyncErrorKey(operation: PendingEntryOperation): PendingSyncErrorKey {
  return operation === 'create_text_entry' ? 'entry.saveError' : 'entry.updateError';
}

export function failedPendingSyncErrorKey(
  entries: readonly LocalPendingEntry[],
): PendingSyncErrorKey | null {
  const failedEntry = entries.find((entry) => !isPendingEntryRetryable(entry));
  return failedEntry ? pendingSyncErrorKey(failedEntry.operation) : null;
}
