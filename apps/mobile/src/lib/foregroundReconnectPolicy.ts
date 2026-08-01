import { RECONNECT_MAX_INTERVAL_MS, reconnectRetryDelayMs } from '@project4/sync';

export const FOREGROUND_RECONNECT_MAX_INTERVAL_MS = RECONNECT_MAX_INTERVAL_MS;

export function foregroundReconnectDelayMs(attempt: number): number {
  return reconnectRetryDelayMs(attempt);
}

export async function refreshForegroundPatientData(
  refreshHome: () => Promise<void>,
  refreshVisibleTimeline?: () => Promise<void>,
): Promise<void> {
  await refreshHome();
  if (refreshVisibleTimeline) {
    await refreshVisibleTimeline();
  }
}
