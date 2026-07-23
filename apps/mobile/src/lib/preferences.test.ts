import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultAppPreferences, type AppPreferences } from '@project4/i18n';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadMobilePreferences, saveMobilePreferences } from './preferences';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

const storedPreferences: AppPreferences = {
  locale: 'sr',
  voiceLanguage: 'sr-RS',
  theme: 'dark',
};

describe('mobile preferences persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads normalized preferences from storage', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(storedPreferences));

    await expect(loadMobilePreferences()).resolves.toEqual(storedPreferences);
  });

  it('uses default preferences when storage cannot be read', async () => {
    vi.mocked(AsyncStorage.getItem).mockRejectedValue(new Error('storage unavailable'));

    await expect(loadMobilePreferences()).resolves.toEqual(defaultAppPreferences);
  });

  it('uses default preferences when stored JSON is invalid', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue('{invalid');

    await expect(loadMobilePreferences()).resolves.toEqual(defaultAppPreferences);
  });

  it('saves preferences using the established storage key', async () => {
    vi.mocked(AsyncStorage.setItem).mockResolvedValue();

    await expect(saveMobilePreferences(storedPreferences)).resolves.toBeUndefined();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'project4.app-preferences.v1',
      JSON.stringify(storedPreferences),
    );
  });

  it('does not reject when preference persistence fails', async () => {
    vi.mocked(AsyncStorage.setItem).mockRejectedValue(new Error('storage unavailable'));

    await expect(saveMobilePreferences(storedPreferences)).resolves.toBeUndefined();
  });
});
