import {
  type LocalPendingEntry,
  type PendingEntryOperation,
  type PendingNoteUpdatePayload,
  type PendingTextEntryPayload,
  type PendingTimestampUpdatePayload,
} from '@project4/sync';
import type { TranslationKey } from '@project4/i18n';

export function pendingSyncOperationKey(operation: PendingEntryOperation): TranslationKey {
  if (operation === 'create_text_entry') return 'sync.failedCreate';
  if (operation === 'update_note') return 'sync.failedNoteUpdate';
  return 'sync.failedTimestampUpdate';
}

export function pendingSyncEntryDetail(entry: LocalPendingEntry): string {
  if (entry.operation === 'create_text_entry') {
    return (entry.payload as PendingTextEntryPayload).text.trim();
  }

  if (entry.operation === 'update_note') {
    return (entry.payload as PendingNoteUpdatePayload).text.trim();
  }

  return (entry.payload as PendingTimestampUpdatePayload).occurredAt;
}
