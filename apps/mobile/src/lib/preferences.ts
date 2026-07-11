import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  defaultAppPreferences,
  normalizeAppPreferences,
  type AppPreferences,
} from '@project4/i18n';

const PREFERENCES_STORAGE_KEY = 'project4.app-preferences.v1';

export async function loadMobilePreferences(): Promise<AppPreferences> {
  const stored = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
  if (!stored) return defaultAppPreferences;

  try {
    return normalizeAppPreferences(JSON.parse(stored));
  } catch {
    return defaultAppPreferences;
  }
}

export async function saveMobilePreferences(preferences: AppPreferences): Promise<void> {
  await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}
