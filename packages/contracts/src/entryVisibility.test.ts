import { describe, expect, it } from 'vitest';

import type { PatientEntry } from './entries';
import {
  filterCachedCompactTimelineEntries,
  filterPatientTimelineEntries,
} from './entryVisibility';

const entries: PatientEntry[] = [
  {
    id: 'entry-text',
    patientId: 'patient-1',
    kind: 'text',
    occurredAt: '2026-06-20T08:00:00.000Z',
    text: 'Regular note',
    createdAt: '2026-06-20T08:00:00.000Z',
    updatedAt: '2026-06-20T08:00:00.000Z',
  },
  {
    id: 'entry-menstruation',
    patientId: 'patient-1',
    kind: 'menstruation',
    occurredAt: '2026-06-20T09:00:00.000Z',
    text: null,
    createdAt: '2026-06-20T09:00:00.000Z',
    updatedAt: '2026-06-20T09:00:00.000Z',
  },
];


const fluidEntry: PatientEntry = {
  id: 'entry-fluid',
  patientId: 'patient-1',
  kind: 'fluid',
  occurredAt: '2026-06-20T10:00:00.000Z',
  text: 'Coffee',
  createdAt: '2026-06-20T10:00:00.000Z',
  updatedAt: '2026-06-20T10:00:00.000Z',
};

describe('patient timeline visibility', () => {
  it('keeps menstruation entries for female patients', () => {
    expect(filterPatientTimelineEntries(entries, 'female')).toEqual(entries);
  });

  it.each(['male', 'other', 'prefer_not_to_say', null, undefined] as const)(
    'hides menstruation entries when baseline sex is %s',
    (sex) => {
      expect(filterPatientTimelineEntries(entries, sex)).toEqual([entries[0]]);
    },
  );

  it('hides fluid entries from compact timelines by default', () => {
    expect(filterPatientTimelineEntries([...entries, fluidEntry], 'female')).toEqual(entries);
  });

  it('includes fluid entries when a detailed timeline opts in', () => {
    expect(
      filterPatientTimelineEntries([...entries, fluidEntry], 'female', {
        includeFluidEntries: true,
      }),
    ).toEqual([...entries, fluidEntry]);
  });

  it('removes only fluid rows when projecting an authorized cache to a compact feed', () => {
    expect(filterCachedCompactTimelineEntries([...entries, fluidEntry])).toEqual(entries);
  });

  it('hides internal daily entries that are not marked visible', () => {
    const dailyEntry: PatientEntry = {
      id: 'entry-daily',
      patientId: 'patient-1',
      kind: 'daily',
      occurredAt: '2026-06-20T10:00:00.000Z',
      text: null,
      createdAt: '2026-06-20T10:00:00.000Z',
      updatedAt: '2026-06-20T10:00:00.000Z',
    };

    expect(
      filterPatientTimelineEntries([...entries, dailyEntry], 'female', {
        visibleDailyEntryIds: [],
      }),
    ).toEqual(entries);
    expect(
      filterPatientTimelineEntries([...entries, dailyEntry], 'female', {
        visibleDailyEntryIds: ['different-daily'],
      }),
    ).toEqual(entries);
    expect(
      filterPatientTimelineEntries([...entries, dailyEntry], 'female', {
        visibleDailyEntryIds: ['entry-daily'],
      }),
    ).toEqual([...entries, dailyEntry]);
  });
});
