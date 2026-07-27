export type DailyProgressActionId =
  | 'daily'
  | 'food'
  | 'symptoms'
  | 'stool'
  | 'medication'
  | 'exercise'
  | 'period'
  | 'notes';

export interface DailyProgressCompletionState {
  dailyCompleted: boolean;
  dailyReadyToSubmit: boolean;
  exerciseCompleted: boolean;
  foodCompleted: boolean;
  medicationCompleted: boolean;
  noteCompleted: boolean;
  periodCompleted: boolean;
  stoolCompleted: boolean;
  symptomsCompleted: boolean;
}

export function isDailyProgressActionComplete(
  actionId: DailyProgressActionId,
  completion: DailyProgressCompletionState,
): boolean {
  if (actionId === 'daily') {
    return completion.dailyCompleted || completion.dailyReadyToSubmit;
  }
  if (actionId === 'food') return completion.foodCompleted;
  if (actionId === 'symptoms') return completion.symptomsCompleted;
  if (actionId === 'stool') return completion.stoolCompleted;
  if (actionId === 'medication') return completion.medicationCompleted;
  if (actionId === 'exercise') return completion.exerciseCompleted;
  if (actionId === 'period') return completion.periodCompleted;
  return completion.noteCompleted;
}

export function primarySubmitHelpKey({
  dailyCompleted,
  offlineMode,
}: {
  dailyCompleted: boolean;
  offlineMode: boolean;
}): 'home.submitCompletedHelp' | 'offline.actionsDisabled' | null {
  if (dailyCompleted) return 'home.submitCompletedHelp';
  if (offlineMode) return 'offline.actionsDisabled';
  return null;
}
