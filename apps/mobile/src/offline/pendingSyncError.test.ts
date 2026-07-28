import {
  createPendingTextEntry,
  createPendingTimestampUpdate,
  markPendingEntryFailed,
} from '@project4/sync';
import { describe, expect, it } from 'vitest';

import { failedPendingSyncErrorKey } from './pendingSyncError';

describe('failedPendingSyncErrorKey', () => {
  it('keeps reporting a failed note creation after later queue passes', () => {
    const failedEntry = markPendingEntryFailed(
      createPendingTextEntry({
        occurredAt: '2026-07-28T08:00:00.000Z',
        patientId: 'patient-1',
        text: 'Offline note',
      }),
      'SYNC_REJECTED',
    );

    expect(failedPendingSyncErrorKey([failedEntry])).toBe('entry.saveError');
  });

  it('reports the update error for a failed timestamp edit', () => {
    const failedEntry = markPendingEntryFailed(
      createPendingTimestampUpdate({
        entryId: 'entry-1',
        occurredAt: '2026-07-28T09:00:00.000Z',
      }),
      'SYNC_REJECTED',
    );

    expect(failedPendingSyncErrorKey([failedEntry])).toBe('entry.updateError');
  });

  it('does not report entries that remain retryable', () => {
    const pendingEntry = createPendingTextEntry({
      occurredAt: '2026-07-28T08:00:00.000Z',
      patientId: 'patient-1',
      text: 'Offline note',
    });

    expect(failedPendingSyncErrorKey([pendingEntry])).toBeNull();
  });
});
