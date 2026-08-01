const RECONNECT_RETRY_DELAYS_MS = [15_000, 30_000, 55_000] as const;

export const RECONNECT_MAX_INTERVAL_MS = 60_000;

export function reconnectRetryDelayMs(attempt: number): number {
  const normalizedAttempt = Number.isFinite(attempt) ? Math.max(1, Math.trunc(attempt)) : 1;
  const index = Math.min(normalizedAttempt - 1, RECONNECT_RETRY_DELAYS_MS.length - 1);

  // Leave margin for request timeouts and timer scheduling while preserving the
  // product requirement that pending work retries within 60 seconds.
  return RECONNECT_RETRY_DELAYS_MS[index] ?? RECONNECT_MAX_INTERVAL_MS;
}
