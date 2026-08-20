import AsyncStorage from '@react-native-async-storage/async-storage';
import { filterPatientTimelineEntries, type PatientEntry } from '@project4/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadCachedEntriesForDay, saveCachedOpenedDayEntries } from './pendingEntries';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

function timelineEntries(patientId: string): PatientEntry[] {
  return [
    {
      id: 'entry-note',
      patientId,
      kind: 'note',
      occurredAt: '2026-06-20T08:00:00.000Z',
      text: 'Regular note',
      createdAt: '2026-06-20T08:00:00.000Z',
      updatedAt: '2026-06-20T08:00:00.000Z',
    },
    {
      id: 'entry-fluid',
      patientId,
      kind: 'fluid',
      occurredAt: '2026-06-20T09:00:00.000Z',
      text: 'Water',
      createdAt: '2026-06-20T09:00:00.000Z',
      updatedAt: '2026-06-20T09:00:00.000Z',
    },
    {
      id: 'entry-menstruation',
      patientId,
      kind: 'menstruation',
      occurredAt: '2026-06-20T10:00:00.000Z',
      text: null,
      createdAt: '2026-06-20T10:00:00.000Z',
      updatedAt: '2026-06-20T10:00:00.000Z',
    },
  ];
}

const entryLocalDay = (entry: PatientEntry) => entry.occurredAt.slice(0, 10);

describe('authorized opened-day cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const values = new Map<string, string>();
    vi.mocked(AsyncStorage.getItem).mockImplementation(async (key) => values.get(key) ?? null);
    vi.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
      values.set(key, value);
    });
  });

  it('preserves female history offline while excluding menstruation for non-female patients', async () => {
    const femaleVisible = filterPatientTimelineEntries(
      timelineEntries('female-patient'),
      'female',
      {
        includeFluidEntries: true,
      },
    );
    await saveCachedOpenedDayEntries('female-patient', femaleVisible, entryLocalDay, [
      '2026-06-20',
    ]);
    expect(
      (await loadCachedEntriesForDay('female-patient', '2026-06-20', entryLocalDay)).map(
        (entry) => entry.kind,
      ),
    ).toEqual(['menstruation', 'fluid', 'note']);

    const maleVisible = filterPatientTimelineEntries(timelineEntries('male-patient'), 'male', {
      includeFluidEntries: true,
    });
    await saveCachedOpenedDayEntries('male-patient', maleVisible, entryLocalDay, ['2026-06-20']);
    expect(
      (await loadCachedEntriesForDay('male-patient', '2026-06-20', entryLocalDay)).map(
        (entry) => entry.kind,
      ),
    ).toEqual(['fluid', 'note']);
  });
});
