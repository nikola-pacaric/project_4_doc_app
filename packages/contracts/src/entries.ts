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
