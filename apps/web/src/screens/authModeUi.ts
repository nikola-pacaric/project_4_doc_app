export type AuthMode = 'patient-login' | 'patient-signup' | 'doctor-login';

interface AuthModeUiState {
  error: null;
  message: null;
  mode: AuthMode;
  passwordHidden: true;
}

export function authModeUiAfterChange(mode: AuthMode): AuthModeUiState {
  return {
    error: null,
    message: null,
    mode,
    passwordHidden: true,
  };
}
