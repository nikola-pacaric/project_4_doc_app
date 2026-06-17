import type { UserRole } from '@project4/contracts';

import type { AppSupabaseClient } from './index';
import { getCurrentProfile } from './profiles';

export interface PatientSignupInput {
  email: string;
  password: string;
  displayName: string;
}

export async function signUpPatient(client: AppSupabaseClient, input: PatientSignupInput) {
  return client.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        display_name: input.displayName.trim(),
      },
    },
  });
}

export async function signInForRole(
  client: AppSupabaseClient,
  email: string,
  password: string,
  expectedRole: UserRole,
) {
  const result = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (result.error || !result.data.user) {
    return result;
  }

  const profile = await getCurrentProfile(client, result.data.user.id);

  if (!profile || profile.role !== expectedRole) {
    await client.auth.signOut();
    return {
      data: { session: null, user: null },
      error: new Error('AUTH_ROLE_MISMATCH'),
    };
  }

  return result;
}
