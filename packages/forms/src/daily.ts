export interface DailyFormDraft {
  wakeTime?: string;
  foodNotes?: string;
  appetite?: 'low' | 'usual' | 'high';
  waterMl?: number;
  activityNotes?: string;
  sleepNotes?: string;
  stressLevel?: 1 | 2 | 3;
  dayDescription?: string;
  notes?: string;
}

export const dailyFormDefaults: DailyFormDraft = {
  activityNotes: '',
  dayDescription: '',
  foodNotes: '',
  notes: '',
  sleepNotes: '',
};
