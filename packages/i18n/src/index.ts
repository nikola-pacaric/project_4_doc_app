import { dictionaries, type Locale, type TranslationKey } from './dictionaries';

export const DEFAULT_LOCALE: Locale = 'en';

export function t(locale: Locale, key: TranslationKey): string {
  return dictionaries[locale][key] ?? dictionaries[DEFAULT_LOCALE][key];
}

export { dictionaries };
export type { Locale, TranslationKey };
