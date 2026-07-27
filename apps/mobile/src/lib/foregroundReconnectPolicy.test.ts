import { describe, expect, it } from 'vitest';

import {
  FOREGROUND_RECONNECT_MAX_INTERVAL_MS,
  foregroundReconnectDelayMs,
  refreshForegroundPatientData,
} from './foregroundReconnectPolicy';

describe('foreground reconnect policy', () => {
  it('backs off quickly for the first foreground retries', () => {
    expect(foregroundReconnectDelayMs(1)).toBe(15_000);
    expect(foregroundReconnectDelayMs(2)).toBe(30_000);
  });

  it('keeps every later retry within the 60-second reconnect guarantee', () => {
    expect(foregroundReconnectDelayMs(3)).toBe(55_000);
    expect(foregroundReconnectDelayMs(100)).toBeLessThan(FOREGROUND_RECONNECT_MAX_INTERVAL_MS);
  });

  it('normalizes invalid attempt counters to the first retry', () => {
    expect(foregroundReconnectDelayMs(0)).toBe(15_000);
    expect(foregroundReconnectDelayMs(Number.NaN)).toBe(15_000);
  });

  it('refreshes the visible timeline after home data', async () => {
    const calls: string[] = [];

    await refreshForegroundPatientData(
      async () => {
        calls.push('home');
      },
      async () => {
        calls.push('timeline');
      },
    );

    expect(calls).toEqual(['home', 'timeline']);
  });

  it('does not fetch a timeline day when the timeline is closed', async () => {
    const calls: string[] = [];

    await refreshForegroundPatientData(async () => {
      calls.push('home');
    });

    expect(calls).toEqual(['home']);
  });
});
