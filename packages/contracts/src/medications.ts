export interface MedicationRecord {
  entryId: string;
  occurredAt: string;
  name: string | null;
  dose: string | null;
  reason: string | null;
  isChronicTherapy: boolean | null;
}
