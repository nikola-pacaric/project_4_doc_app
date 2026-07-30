import { describe, expect, it } from 'vitest';

import { appLocaleTag, formatShortDateTime } from './dateTime';

describe('app-locale date and time formatting', () => {
  it('maps supported app locales to explicit platform locale tags', () => {
    expect(appLocaleTag('en')).toBe('en-US');
    expect(appLocaleTag('sr')).toBe('sr-RS');
  });

  it('formats with the selected app locale instead of the operating-system locale', () => {
    const value = '2026-07-29T10:15:00.000Z';
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    };

    expect(formatShortDateTime(value, 'en')).toBe(
      new Intl.DateTimeFormat('en-US', options).format(new Date(value)),
    );
    expect(formatShortDateTime(value, 'sr')).toBe(
      new Intl.DateTimeFormat('sr-RS', options).format(new Date(value)),
    );
  });
});
