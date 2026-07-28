import { describe, expect, it } from 'vitest';

import { initialLoadViewState } from './initialLoadViewState';

describe('initial load view state', () => {
  it('keeps loading precedence while a retry is in progress', () => {
    expect(initialLoadViewState(true, true)).toBe('loading');
  });

  it('blocks content after an initial load failure', () => {
    expect(initialLoadViewState(false, true)).toBe('failure');
  });

  it('allows content only after a successful load', () => {
    expect(initialLoadViewState(false, false)).toBe('content');
  });
});
