import type { Locale } from './dictionaries';

export type ThemePreference = 'light' | 'dark';
export type VoiceLanguage = 'en-US' | 'sr-RS';

export interface AppPreferences {
  locale: Locale;
  voiceLanguage: VoiceLanguage;
  theme: ThemePreference;
}

export const defaultAppPreferences: AppPreferences = {
  locale: 'en',
  voiceLanguage: 'en-US',
  theme: 'light',
};

let activeLocale: Locale = defaultAppPreferences.locale;
let activeVoiceLanguage: VoiceLanguage = defaultAppPreferences.voiceLanguage;

export function getActiveLocale(): Locale {
  return activeLocale;
}

export function setActiveLocale(locale: Locale): void {
  activeLocale = locale;
}

export function getActiveVoiceLanguage(): VoiceLanguage {
  return activeVoiceLanguage;
}

export function setActiveVoiceLanguage(language: VoiceLanguage): void {
  activeVoiceLanguage = language;
}

export function normalizeAppPreferences(value: unknown): AppPreferences {
  if (!value || typeof value !== 'object') {
    return defaultAppPreferences;
  }

  const candidate = value as Partial<AppPreferences>;
  const locale = candidate.locale === 'sr' ? 'sr' : defaultAppPreferences.locale;
  const voiceLanguage =
    candidate.voiceLanguage === 'sr-RS' || candidate.voiceLanguage === 'en-US'
      ? candidate.voiceLanguage
      : locale === 'sr'
        ? 'sr-RS'
        : defaultAppPreferences.voiceLanguage;
  const theme = candidate.theme === 'dark' ? 'dark' : defaultAppPreferences.theme;

  return { locale, voiceLanguage, theme };
}
