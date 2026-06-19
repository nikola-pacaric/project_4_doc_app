export type BristolStoolType = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type StoolUrgencyLevel = 'none' | 'mild' | 'moderate' | 'severe';

export interface StoolRecord {
  entryId: string;
  occurredAt: string;
  bristolType: BristolStoolType;
  urgencyLevel: StoolUrgencyLevel;
  pain: boolean;
  mucus: boolean;
  blood: boolean;
  fattyStool: boolean;
  blackStool: boolean;
  notes: string | null;
}
