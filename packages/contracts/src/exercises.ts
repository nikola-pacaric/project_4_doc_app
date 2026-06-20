export const exerciseIntensities = ['light', 'moderate', 'vigorous'] as const;

export type ExerciseIntensity = (typeof exerciseIntensities)[number];

export interface ExerciseRecord {
  entryId: string;
  occurredAt: string;
  activity: string;
  durationMinutes: number;
  intensity: ExerciseIntensity;
  notes: string | null;
}
