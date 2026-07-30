export type SymptomInitialLoadView = 'loading' | 'failure' | 'content';

export interface SymptomLoadRecoveryState {
  loading: boolean;
  loadFailed: boolean;
  error: string | null;
  message: string | null;
  loadAttempt: number;
}

export function symptomInitialLoadView(
  loading: boolean,
  loadFailed: boolean,
): SymptomInitialLoadView {
  if (loading) return 'loading';
  return loadFailed ? 'failure' : 'content';
}

export function retrySymptomLoad(
  state: SymptomLoadRecoveryState,
): SymptomLoadRecoveryState {
  return {
    ...state,
    loading: true,
    loadFailed: false,
    error: null,
    message: null,
    loadAttempt: state.loadAttempt + 1,
  };
}
