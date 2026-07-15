import { describe, expect, it } from 'vitest';
import type { PatientEntry } from '@project4/contracts';

import {
  createPendingNoteUpdate,
  createPendingTimestampUpdate,
  createPendingTextEntry,
  cachedOpenedDayEntries,
  dedupePendingEntries,
  isPendingEntryId,
  mergeOpenedDayEntryCache,
  mergePendingTextEntries,
  pendingTimelineEntryIds,
  pendingTextEntryToPatientEntry,
  replaceOpenedDayEntryCache,
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

  it('applies pending note text and timestamp updates to existing timeline entries', () => {
    const pending = createPendingNoteUpdate(
      {
        entryId: 'server-1',
        text: 'Edited offline',
        occurredAt: '2026-07-03T12:15:00.000Z',
      },
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

    expect(merged[0]).toMatchObject({
      id: 'server-1',
      text: 'Edited offline',
      occurredAt: '2026-07-03T12:15:00.000Z',
    });
    expect(pendingTimelineEntryIds([pending])).toEqual(['server-1']);
  });

  it('deduplicates retries by operation ID without collapsing distinct identical notes', () => {
    const first = createPendingTextEntry(
      { patientId: 'patient-1', text: 'Same note', occurredAt: '2026-07-03T08:00:00.000Z' },
      new Date('2026-07-03T08:01:00.000Z'),
    );
    const second = createPendingTextEntry(
      { patientId: 'patient-1', text: 'Same note', occurredAt: '2026-07-03T08:00:00.000Z' },
      new Date('2026-07-03T08:02:00.000Z'),
    );
    const timestampUpdate = createPendingTimestampUpdate(
      { entryId: 'server-1', occurredAt: '2026-07-03T08:00:00.000Z' },
      new Date('2026-07-03T08:03:00.000Z'),
    );

    expect(dedupePendingEntries([first, { ...first }, second, timestampUpdate])).toEqual([
      first,
      second,
      timestampUpdate,
    ]);
  });
});

describe('offline-lite opened-day cache', () => {
  const entry = (id: string, occurredAt: string): PatientEntry => ({
    id,
    patientId: 'patient-1',
    kind: 'note',
    occurredAt,
    text: id,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  });

  it('stores opened entries by local day and keeps days accumulated', () => {
    const cache = mergeOpenedDayEntryCache(
      {},
      [entry('first', '2026-07-01T08:00:00.000Z'), entry('second', '2026-07-02T09:00:00.000Z')],
      (candidate) => candidate.occurredAt.slice(0, 10),
    );
    const nextCache = mergeOpenedDayEntryCache(
      cache,
      [entry('third', '2026-07-03T10:00:00.000Z')],
      (candidate) => candidate.occurredAt.slice(0, 10),
    );

    expect(Object.keys(nextCache)).toEqual(['2026-07-03', '2026-07-02', '2026-07-01']);
    expect(cachedOpenedDayEntries(nextCache).map((candidate) => candidate.id)).toEqual([
      'third',
      'second',
      'first',
    ]);
  });

  it('replaces an already cached entry instead of duplicating it', () => {
    const cache = mergeOpenedDayEntryCache(
      { '2026-07-03': [entry('first', '2026-07-03T08:00:00.000Z')] },
      [entry('first', '2026-07-03T11:00:00.000Z')],
      (candidate) => candidate.occurredAt.slice(0, 10),
    );

    expect(cache['2026-07-03']?.map((candidate) => candidate.occurredAt)).toEqual([
      '2026-07-03T11:00:00.000Z',
    ]);
  });

  it('keeps the most recent opened-day buckets within the configured limit', () => {
    const cache = mergeOpenedDayEntryCache(
      {
        '2026-07-01': [entry('first', '2026-07-01T08:00:00.000Z')],
        '2026-07-02': [entry('second', '2026-07-02T08:00:00.000Z')],
      },
      [entry('third', '2026-07-03T08:00:00.000Z')],
      (candidate) => candidate.occurredAt.slice(0, 10),
      2,
    );

    expect(Object.keys(cache)).toEqual(['2026-07-03', '2026-07-02']);
  });

  it('replaces loaded day buckets so stale deleted server rows leave the cache', () => {
    const cache = replaceOpenedDayEntryCache(
      {
        '2026-07-02': [entry('stale-deleted', '2026-07-02T08:00:00.000Z')],
        '2026-07-01': [entry('older-opened', '2026-07-01T08:00:00.000Z')],
      },
      [entry('fresh', '2026-07-02T09:00:00.000Z')],
      (candidate) => candidate.occurredAt.slice(0, 10),
      ['2026-07-02'],
    );

    expect(cache['2026-07-02']?.map((candidate) => candidate.id)).toEqual(['fresh']);
    expect(cache['2026-07-01']?.map((candidate) => candidate.id)).toEqual(['older-opened']);
  });
});
