import type { Locale } from './dictionaries';

export function appLocaleTag(locale: Locale): 'en-US' | 'sr-RS' {
  return locale === 'sr' ? 'sr-RS' : 'en-US';
}

export function formatShortDateTime(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(appLocaleTag(locale), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
