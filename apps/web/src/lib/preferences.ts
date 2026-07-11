import {
  defaultAppPreferences,
  normalizeAppPreferences,
  type AppPreferences,
} from '@project4/i18n';

const PREFERENCES_STORAGE_KEY = 'project4.app-preferences.v1';

export function loadWebPreferences(): AppPreferences {
  try {
    const stored = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    return stored ? normalizeAppPreferences(JSON.parse(stored)) : defaultAppPreferences;
  } catch {
    return defaultAppPreferences;
  }
}

export function saveWebPreferences(preferences: AppPreferences): void {
  try {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Preference persistence is best-effort; the current session remains usable.
  }
}
