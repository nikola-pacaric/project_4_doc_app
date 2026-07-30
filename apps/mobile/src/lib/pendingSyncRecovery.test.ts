import {
  createPendingNoteUpdate,
  createPendingTextEntry,
  createPendingTimestampUpdate,
} from '@project4/sync';
import { describe, expect, it } from 'vitest';

import { pendingSyncEntryDetail, pendingSyncOperationKey } from './pendingSyncRecovery';

describe('mobile pending sync recovery presentation', () => {
  it('describes a failed local note creation without exposing its backend error', () => {
    const entry = createPendingTextEntry({
      occurredAt: '2026-07-30T08:00:00.000Z',
      patientId: 'patient-1',
      text: '  Keep this note  ',
    });

    expect(pendingSyncOperationKey(entry.operation)).toBe('sync.failedCreate');
    expect(pendingSyncEntryDetail(entry)).toBe('Keep this note');
  });

  it('describes a failed note edit using the edited text', () => {
    const entry = createPendingNoteUpdate({
      entryId: 'entry-1',
      occurredAt: '2026-07-30T09:00:00.000Z',
      text: '  Updated note  ',
    });

    expect(pendingSyncOperationKey(entry.operation)).toBe('sync.failedNoteUpdate');
    expect(pendingSyncEntryDetail(entry)).toBe('Updated note');
  });

  it('describes a failed timestamp edit using the requested timestamp', () => {
    const entry = createPendingTimestampUpdate({
      entryId: 'entry-1',
      occurredAt: '2026-07-30T10:30:00.000Z',
    });

    expect(pendingSyncOperationKey(entry.operation)).toBe('sync.failedTimestampUpdate');
    expect(pendingSyncEntryDetail(entry)).toBe('2026-07-30T10:30:00.000Z');
  });
});
