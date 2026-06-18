export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';

export interface MealRecord {
  entryId: string;
  occurredAt: string;
  type: MealType | null;
  name: string | null;
  description: string | null;
}
