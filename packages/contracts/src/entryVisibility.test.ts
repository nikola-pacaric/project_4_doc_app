import { describe, expect, it } from 'vitest';

import type { PatientEntry } from './entries';
import { filterPatientTimelineEntries } from './entryVisibility';

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
});
