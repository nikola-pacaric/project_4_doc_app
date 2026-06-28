export type EntryKind =
  | 'text'
  | 'daily'
  | 'meal'
  | 'symptom'
  | 'stool'
  | 'medication'
  | 'exercise'
  | 'menstruation'
  | 'note'
  | 'custom';

export interface PatientEntry {
  id: string;
  patientId: string;
  kind: EntryKind;
  occurredAt: string;
  text: string | null;
  createdAt: string;
  updatedAt: string;
}

export const NO_STOOL_TODAY_TEXT = 'No stool today';

export function isNoStoolTodayEntry(entry: PatientEntry): boolean {
  return entry.kind === 'note' && entry.text?.trim() === NO_STOOL_TODAY_TEXT;
}
