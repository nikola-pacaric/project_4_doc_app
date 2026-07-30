export function isWeightReminderDue(
  weightReminderDueAt: string | null | undefined,
  nowMs: number,
): boolean {
  if (!weightReminderDueAt) return false;
  const dueAtMs = Date.parse(weightReminderDueAt);
  return Number.isFinite(dueAtMs) && dueAtMs <= nowMs;
}
