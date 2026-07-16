import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearAllPatientOfflineData } from './pendingEntries';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getAllKeys: vi.fn(),
    multiRemove: vi.fn(),
  },
}));

describe('clearAllPatientOfflineData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes every medical cache while preserving preferences and auth storage', async () => {
    vi.mocked(AsyncStorage.getAllKeys).mockResolvedValue([
      'project4:preferences',
      'sb-project-auth-token',
      'project4:pending-entries:patient-1',
      'project4:recent-entries:patient-2',
      'project4:opened-day-entries:patient-3',
    ]);
    vi.mocked(AsyncStorage.multiRemove).mockResolvedValue();

    await clearAllPatientOfflineData();

    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
      'project4:pending-entries:patient-1',
      'project4:recent-entries:patient-2',
      'project4:opened-day-entries:patient-3',
    ]);
  });
});
