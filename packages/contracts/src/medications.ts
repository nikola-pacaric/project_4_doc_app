export interface MedicationRecord {
  entryId: string;
  occurredAt: string;
  name: string;
  dose: string;
  reason: string | null;
  isChronicTherapy: boolean;
}
