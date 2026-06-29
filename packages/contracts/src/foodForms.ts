export interface FoodFormDetails {
  entryId: string;
  waterLiters: number | null;
  hasOtherFluids: boolean | null;
  otherFluids: string | null;
  otherFluidsDisplay: string | null;
}

export interface FoodFormRecord {
  entryId: string;
  occurredAt: string;
  details: FoodFormDetails | null;
}
