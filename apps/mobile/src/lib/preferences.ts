import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  defaultAppPreferences,
  normalizeAppPreferences,
  type AppPreferences,
} from '@project4/i18n';

const PREFERENCES_STORAGE_KEY = 'project4.app-preferences.v1';

export async function loadMobilePreferences(): Promise<AppPreferences> {
  try {
    const stored = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
    return stored ? normalizeAppPreferences(JSON.parse(stored)) : defaultAppPreferences;
  } catch {
    return defaultAppPreferences;
  }
}

export async function saveMobilePreferences(preferences: AppPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Preference persistence is best-effort; the current session remains usable.
  }
}
