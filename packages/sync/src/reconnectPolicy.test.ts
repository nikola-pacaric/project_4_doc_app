import { describe, expect, it } from 'vitest';

import { RECONNECT_MAX_INTERVAL_MS, reconnectRetryDelayMs } from './reconnectPolicy';

describe('shared reconnect retry policy', () => {
  it('uses the same bounded cadence for every client', () => {
    expect([1, 2, 3, 4, 100].map(reconnectRetryDelayMs)).toEqual([
      15_000,
      30_000,
      55_000,
      55_000,
      55_000,
    ]);
  });

  it('keeps every retry within the 60-second reconnect guarantee', () => {
    expect(reconnectRetryDelayMs(100)).toBeLessThan(RECONNECT_MAX_INTERVAL_MS);
  });

  it('normalizes invalid attempt counters to the first retry', () => {
    expect(reconnectRetryDelayMs(0)).toBe(15_000);
    expect(reconnectRetryDelayMs(-4)).toBe(15_000);
    expect(reconnectRetryDelayMs(Number.NaN)).toBe(15_000);
  });
});
