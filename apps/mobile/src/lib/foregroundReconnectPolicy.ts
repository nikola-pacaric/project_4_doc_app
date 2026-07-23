const FOREGROUND_RECONNECT_DELAYS_MS = [15_000, 30_000, 55_000] as const;

export const FOREGROUND_RECONNECT_MAX_INTERVAL_MS = 60_000;

export function foregroundReconnectDelayMs(attempt: number): number {
  const normalizedAttempt = Number.isFinite(attempt) ? Math.max(1, Math.trunc(attempt)) : 1;
  const index = Math.min(normalizedAttempt - 1, FOREGROUND_RECONNECT_DELAYS_MS.length - 1);

  // Keep margin for the existing 2.5-second request timeout and timer scheduling.
  return FOREGROUND_RECONNECT_DELAYS_MS[index] ?? FOREGROUND_RECONNECT_MAX_INTERVAL_MS;
}
