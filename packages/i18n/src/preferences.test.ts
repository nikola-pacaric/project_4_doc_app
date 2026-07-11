import { describe, expect, it } from 'vitest';

import { defaultAppPreferences, normalizeAppPreferences } from './preferences';

describe('normalizeAppPreferences', () => {
  it('keeps a valid independent voice language and dark theme', () => {
    expect(
      normalizeAppPreferences({ locale: 'sr', voiceLanguage: 'en-US', theme: 'dark' }),
    ).toEqual({ locale: 'sr', voiceLanguage: 'en-US', theme: 'dark' });
  });

  it('falls back safely for malformed persisted values', () => {
    expect(normalizeAppPreferences({ locale: 'de', voiceLanguage: 'fr-FR', theme: 'system' })).toEqual(
      defaultAppPreferences,
    );
  });
});
