import type { UserProfile } from '@project4/contracts';

import type { AppSupabaseClient } from './index';

interface UserProfileRow {
  id: string;
  role: UserProfile['role'];
  display_name: string | null;
  consent_accepted_at: string | null;
}

export function toUserProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    role: row.role,
    displayName: row.display_name,
    consentAcceptedAt: row.consent_accepted_at,
  };
}

export async function getCurrentProfile(
  client: AppSupabaseClient,
  userId: string,
): Promise<UserProfile | null> {
  const { data, error } = await client
    .from('user_profiles')
    .select('id, role, display_name, consent_accepted_at')
    .eq('id', userId)
    .maybeSingle<UserProfileRow>();

  if (error) {
    throw error;
  }

  return data ? toUserProfile(data) : null;
}

export async function acceptCurrentConsent(
  client: AppSupabaseClient,
  userId: string,
): Promise<UserProfile> {
  const acceptedAt = new Date().toISOString();
  const { data, error } = await client
    .from('user_profiles')
    .update({ consent_accepted_at: acceptedAt })
    .eq('id', userId)
    .select('id, role, display_name, consent_accepted_at')
    .single<UserProfileRow>();

  if (error) {
    throw error;
  }

  return toUserProfile(data);
}
