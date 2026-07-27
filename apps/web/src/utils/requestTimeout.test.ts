import { afterEach, describe, expect, it, vi } from 'vitest';

import { REQUEST_TIMEOUT_ERROR_NAME, withRequestTimeout } from './requestTimeout';

afterEach(() => {
  vi.useRealTimers();
});

describe('withRequestTimeout', () => {
  it('returns a request result that arrives before the deadline', async () => {
    await expect(withRequestTimeout(Promise.resolve('loaded'), 2_500)).resolves.toBe('loaded');
  });

  it('rejects a request that does not settle before the deadline', async () => {
    vi.useFakeTimers();
    const result = withRequestTimeout(new Promise<never>(() => undefined), 2_500);
    const assertion = expect(result).rejects.toMatchObject({
      name: REQUEST_TIMEOUT_ERROR_NAME,
      message: 'Request timed out',
    });

    await vi.advanceTimersByTimeAsync(2_500);
    await assertion;
  });

  it('rejects an aggregate when one request stalls', async () => {
    vi.useFakeTimers();
    const result = withRequestTimeout(
      Promise.all([Promise.resolve(['meal-entry']), new Promise<never>(() => undefined)]),
      2_500,
    );
    const assertion = expect(result).rejects.toMatchObject({
      name: REQUEST_TIMEOUT_ERROR_NAME,
    });

    await vi.advanceTimersByTimeAsync(2_500);
    await assertion;
  });

  it('preserves a request error that arrives before the deadline', async () => {
    const requestError = new Error('Request failed');
    await expect(withRequestTimeout(Promise.reject(requestError), 2_500)).rejects.toBe(
      requestError,
    );
  });
});
