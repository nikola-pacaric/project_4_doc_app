import { describe, expect, it } from 'vitest';

import {
  createPendingTimestampUpdate,
  createPendingTextEntry,
  isPendingEntryId,
  mergePendingTextEntries,
  pendingTimelineEntryIds,
  pendingTextEntryToPatientEntry,
  removePendingEntry,
} from './index';

describe('offline-lite pending text entries', () => {
  it('converts a pending text entry into a timeline note', () => {
    const pending = createPendingTextEntry(
      {
        patientId: 'patient-1',
        text: 'Offline note',
        occurredAt: '2026-07-03T08:30:00.000Z',
      },
      new Date('2026-07-03T08:31:00.000Z'),
    );

    expect(isPendingEntryId(pending.id)).toBe(true);
    expect(pendingTextEntryToPatientEntry(pending)).toMatchObject({
      id: pending.id,
      patientId: 'patient-1',
      kind: 'note',
      occurredAt: '2026-07-03T08:30:00.000Z',
      text: 'Offline note',
    });
  });

  it('merges pending entries ahead of older server entries', () => {
    const pending = createPendingTextEntry(
      {
        patientId: 'patient-1',
        text: 'Pending',
        occurredAt: '2026-07-03T10:00:00.000Z',
      },
      new Date('2026-07-03T10:01:00.000Z'),
    );

    const merged = mergePendingTextEntries(
      [
        {
          id: 'server-1',
          patientId: 'patient-1',
          kind: 'note',
          occurredAt: '2026-07-03T09:00:00.000Z',
          text: 'Server',
          createdAt: '2026-07-03T09:00:00.000Z',
          updatedAt: '2026-07-03T09:00:00.000Z',
        },
      ],
      [pending],
    );

    expect(merged.map((entry) => entry.id)).toEqual([pending.id, 'server-1']);
  });

  it('removes synced entries from the queue', () => {
    const first = createPendingTextEntry(
      { patientId: 'patient-1', text: 'First', occurredAt: '2026-07-03T08:00:00.000Z' },
      new Date('2026-07-03T08:00:00.000Z'),
    );
    const second = createPendingTextEntry(
      { patientId: 'patient-1', text: 'Second', occurredAt: '2026-07-03T09:00:00.000Z' },
      new Date('2026-07-03T09:00:00.000Z'),
    );

    expect(removePendingEntry([first, second], first.id)).toEqual([second]);
  });

  it('applies pending timestamp updates to existing timeline entries', () => {
    const pending = createPendingTimestampUpdate(
      { entryId: 'server-1', occurredAt: '2026-07-03T12:15:00.000Z' },
      new Date('2026-07-03T12:16:00.000Z'),
    );

    const merged = mergePendingTextEntries(
      [
        {
          id: 'server-1',
          patientId: 'patient-1',
          kind: 'note',
          occurredAt: '2026-07-03T09:00:00.000Z',
          text: 'Server',
          createdAt: '2026-07-03T09:00:00.000Z',
          updatedAt: '2026-07-03T09:00:00.000Z',
        },
      ],
      [pending],
    );

    expect(merged[0]?.occurredAt).toBe('2026-07-03T12:15:00.000Z');
    expect(pendingTimelineEntryIds([pending])).toEqual(['server-1']);
  });
});
