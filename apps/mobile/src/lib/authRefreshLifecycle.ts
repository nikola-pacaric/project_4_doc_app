import type { AppStateStatus } from 'react-native';

export interface AuthAutoRefreshController {
  startAutoRefresh(): void | Promise<void>;
  stopAutoRefresh(): void | Promise<void>;
}

export interface AppStateChangeSource {
  addEventListener(
    type: 'change',
    listener: (state: AppStateStatus) => void,
  ): {
    remove(): void;
  };
}

export function updateAuthAutoRefreshForAppState(
  auth: AuthAutoRefreshController,
  state: AppStateStatus,
) {
  if (state === 'active') {
    void auth.startAutoRefresh();
    return;
  }

  void auth.stopAutoRefresh();
}

export function registerAuthAutoRefreshForAppState(
  auth: AuthAutoRefreshController,
  appState: AppStateChangeSource,
) {
  const subscription = appState.addEventListener('change', (state) => {
    updateAuthAutoRefreshForAppState(auth, state);
  });

  return () => subscription.remove();
}
