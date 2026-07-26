import type { PendingEntryOperation } from '@project4/sync';

export type PendingSyncErrorKey = 'entry.saveError' | 'entry.updateError';

export function pendingSyncErrorKey(operation: PendingEntryOperation): PendingSyncErrorKey {
  return operation === 'create_text_entry' ? 'entry.saveError' : 'entry.updateError';
}
