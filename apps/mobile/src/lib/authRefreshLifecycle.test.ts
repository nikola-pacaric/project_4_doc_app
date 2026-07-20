import type { AppStateStatus } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

import {
  registerAuthAutoRefreshForAppState,
  type AppStateChangeSource,
  type AuthAutoRefreshController,
} from './authRefreshLifecycle';

describe('mobile auth refresh lifecycle', () => {
  it('refreshes only while active and unregisters the AppState listener', () => {
    const listeners: Array<(state: AppStateStatus) => void> = [];
    const remove = vi.fn();
    const appState: AppStateChangeSource = {
      addEventListener: vi.fn((_type, listener) => {
        listeners.push(listener);
        return { remove };
      }),
    };
    const auth: AuthAutoRefreshController = {
      startAutoRefresh: vi.fn(),
      stopAutoRefresh: vi.fn(),
    };

    const unregister = registerAuthAutoRefreshForAppState(auth, appState);

    listeners[0]?.('active');
    listeners[0]?.('background');
    listeners[0]?.('inactive');
    unregister();

    expect(appState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(auth.startAutoRefresh).toHaveBeenCalledTimes(1);
    expect(auth.stopAutoRefresh).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
