import { describe, expect, it } from 'vitest';

import { getPatientSignupValidationError, PATIENT_SIGNUP_PASSWORD_MIN_LENGTH } from './auth';

const validSignup = {
  displayName: 'Patient',
  email: 'patient@example.com',
  password: 'secret1',
};

describe('patient signup validation', () => {
  it('requires a trimmed display name', () => {
    expect(getPatientSignupValidationError({ ...validSignup, displayName: '   ' })).toBe(
      'auth.displayNameRequired',
    );
  });

  it('requires a complete email address', () => {
    expect(getPatientSignupValidationError({ ...validSignup, email: 'patient@invalid' })).toBe(
      'auth.emailInvalid',
    );
  });

  it('requires the shared password minimum', () => {
    expect(PATIENT_SIGNUP_PASSWORD_MIN_LENGTH).toBe(6);
    expect(getPatientSignupValidationError({ ...validSignup, password: '12345' })).toBe(
      'auth.passwordTooShort',
    );
  });

  it('accepts valid trimmed signup values', () => {
    expect(
      getPatientSignupValidationError({
        ...validSignup,
        displayName: ' Patient ',
        email: ' patient@example.com ',
      }),
    ).toBeNull();
  });
});
