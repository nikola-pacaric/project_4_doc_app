export const menstruationFlows = ['light', 'moderate', 'heavy'] as const;

export type MenstruationFlow = (typeof menstruationFlows)[number];
export type MenstruationPainLevel = 1 | 2 | 3;

export interface MenstruationRecord {
  entryId: string;
  occurredAt: string;
  flow: MenstruationFlow;
  painLevel: MenstruationPainLevel;
  notes: string | null;
}
