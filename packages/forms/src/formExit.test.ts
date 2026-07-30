import { describe, expect, it } from 'vitest';

import { decideFormExit } from './formExit';

describe('decideFormExit', () => {
  it.each([
    {
      state: { busy: true, hasUnsavedChanges: false },
      expected: 'block',
    },
    {
      state: { busy: true, hasUnsavedChanges: true },
      expected: 'block',
    },
    {
      state: { busy: false, hasUnsavedChanges: false },
      expected: 'allow',
    },
    {
      state: { busy: false, hasUnsavedChanges: true },
      expected: 'confirm',
    },
  ] as const)('returns $expected for $state', ({ state, expected }) => {
    expect(decideFormExit(state)).toBe(expected);
  });
});
