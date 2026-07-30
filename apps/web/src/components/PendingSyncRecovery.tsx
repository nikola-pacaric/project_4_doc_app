import { formatShortDateTime, t, type Locale, type TranslationKey } from '@project4/i18n';
import type {
  LocalPendingEntry,
  PendingNoteUpdatePayload,
  PendingTextEntryPayload,
  PendingTimestampUpdatePayload,
} from '@project4/sync';

interface PendingSyncRecoveryProps {
  entries: readonly LocalPendingEntry[];
  locale: Locale;
  onDiscard: (entryId: string) => void;
  onRetry: (entryId: string) => void;
  retryingEntryId: string | null;
}

function operationLabelKey(entry: LocalPendingEntry): TranslationKey {
  switch (entry.operation) {
    case 'create_text_entry':
      return 'sync.failedCreate';
    case 'update_note':
      return 'sync.failedNoteUpdate';
    case 'update_entry_timestamp':
      return 'sync.failedTimestampUpdate';
  }
}

function operationOccurredAt(entry: LocalPendingEntry): string {
  const payload = entry.payload as
    | PendingTextEntryPayload
    | PendingNoteUpdatePayload
    | PendingTimestampUpdatePayload;
  return payload.occurredAt;
}

export function PendingSyncRecovery({
  entries,
  locale,
  onDiscard,
  onRetry,
  retryingEntryId,
}: PendingSyncRecoveryProps) {
  if (!entries.length) return null;

  return (
    <section aria-labelledby="pending-sync-recovery-title" className="web-sync-recovery">
      <div className="web-sync-recovery-heading">
        <h2 id="pending-sync-recovery-title">{t(locale, 'sync.failedTitle')}</h2>
        <p>{t(locale, 'sync.failedBody')}</p>
      </div>

      <ul className="web-sync-recovery-list">
        {entries.map((entry) => {
          const label = t(locale, operationLabelKey(entry));
          const retrying = retryingEntryId === entry.id;
          const recoveryBusy = retryingEntryId !== null;
          const titleId = `pending-sync-entry-${entry.id}`;

          return (
            <li aria-busy={retrying || undefined} key={entry.id}>
              <div>
                <h3 id={titleId}>{label}</h3>
                <p>{formatShortDateTime(operationOccurredAt(entry), locale)}</p>
                <p className="web-sync-recovery-status">{t(locale, 'sync.failedStatus')}</p>
              </div>
              <div aria-labelledby={titleId} className="web-sync-recovery-actions" role="group">
                <button
                  aria-label={`${t(locale, 'sync.retry')}: ${label}`}
                  disabled={recoveryBusy}
                  onClick={() => onRetry(entry.id)}
                  type="button"
                >
                  {t(locale, retrying ? 'sync.retrying' : 'sync.retry')}
                </button>
                <button
                  aria-label={`${t(locale, 'sync.discard')}: ${label}`}
                  disabled={recoveryBusy}
                  onClick={() => onDiscard(entry.id)}
                  type="button"
                >
                  {t(locale, 'sync.discard')}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
