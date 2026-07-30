export type FormExitDecision = 'allow' | 'confirm' | 'block';

export function decideFormExit({
  busy,
  hasUnsavedChanges,
}: {
  busy: boolean;
  hasUnsavedChanges: boolean;
}): FormExitDecision {
  if (busy) return 'block';
  return hasUnsavedChanges ? 'confirm' : 'allow';
}
