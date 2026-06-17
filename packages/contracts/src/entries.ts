export type EntryKind =
  | 'text'
  | 'daily'
  | 'meal'
  | 'symptom'
  | 'stool'
  | 'medication'
  | 'exercise'
  | 'menstruation'
  | 'custom';

export interface PatientEntry {
  id: string;
  patientId: string;
  kind: EntryKind;
  occurredAt: string;
  text?: string;
  createdAt: string;
  updatedAt: string;
}
