import { describe, expect, it } from 'vitest';

import { retrySymptomLoad, symptomInitialLoadView } from './symptomLoadRecovery';

describe('mobile symptom initial-load recovery', () => {
  it('keeps loading ahead of a stale failure and exposes failure only after loading finishes', () => {
    expect(symptomInitialLoadView(true, true)).toBe('loading');
    expect(symptomInitialLoadView(false, true)).toBe('failure');
    expect(symptomInitialLoadView(false, false)).toBe('content');
  });

  it('clears stale feedback and advances the attempt when retrying', () => {
    expect(
      retrySymptomLoad({
        loading: false,
        loadFailed: true,
        error: 'Could not load symptoms.',
        message: 'Stale success',
        loadAttempt: 2,
      }),
    ).toEqual({
      loading: true,
      loadFailed: false,
      error: null,
      message: null,
      loadAttempt: 3,
    });
  });
});
