import type { TranslationKey } from '@project4/i18n';

export interface PatientSignupDraft {
  displayName: string;
  email: string;
  password: string;
}

export const PATIENT_SIGNUP_PASSWORD_MIN_LENGTH = 6;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getPatientSignupValidationError(draft: PatientSignupDraft): TranslationKey | null {
  if (!draft.displayName.trim()) return 'auth.displayNameRequired';
  if (!emailPattern.test(draft.email.trim())) return 'auth.emailInvalid';
  if (draft.password.length < PATIENT_SIGNUP_PASSWORD_MIN_LENGTH) {
    return 'auth.passwordTooShort';
  }
  return null;
}
