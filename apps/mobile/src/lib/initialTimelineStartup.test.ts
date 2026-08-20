import { afterEach, describe, expect, it, vi } from 'vitest';

import { scheduleInitialTimelineLoad } from './initialTimelineStartup';

describe('scheduleInitialTimelineLoad', () => {
  afterEach(() => vi.useRealTimers());

  it('loads after a setup-cleanup replay and only once', () => {
    vi.useFakeTimers();
    let loaded = false;
    const load = vi.fn();
    const markLoaded = () => {
      loaded = true;
    };

    const cleanupFirstSetup = scheduleInitialTimelineLoad(() => loaded, markLoaded, load);
    cleanupFirstSetup();
    const cleanupReplay = scheduleInitialTimelineLoad(() => loaded, markLoaded, load);

    vi.runAllTimers();
    cleanupReplay();
    scheduleInitialTimelineLoad(() => loaded, markLoaded, load);
    vi.runAllTimers();

    expect(load).toHaveBeenCalledTimes(1);
    expect(loaded).toBe(true);
  });
});
