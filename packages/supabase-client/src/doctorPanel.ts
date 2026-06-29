import type { UserProfile } from '@project4/contracts';

import type { AppSupabaseClient } from './index';

export interface DoctorInviteCode {
  id: string;
  code: string;
  expiresAt: string;
  revokedAt: string | null;
  redeemedByPatientId: string | null;
  redeemedAt: string | null;
  createdAt: string;
}

interface DoctorInviteCodeRow {
  id: string;
  code: string;
  expires_at: string;
  revoked_at: string | null;
  redeemed_by_patient_id: string | null;
  redeemed_at: string | null;
  created_at: string;
}

export interface LinkedPatientSummary {
  accessId: string;
  patientId: string;
  displayName: string | null;
  linkedAt: string;
}

interface DoctorPatientAccessRow {
  id: string;
  patient_id: string;
  created_at: string;
}

interface UserProfileRow {
  id: string;
  role: UserProfile['role'];
  display_name: string | null;
  consent_accepted_at: string | null;
}

const inviteColumns =
  'id, code, expires_at, revoked_at, redeemed_by_patient_id, redeemed_at, created_at';

function toDoctorInviteCode(row: DoctorInviteCodeRow): DoctorInviteCode {
  return {
    id: row.id,
    code: row.code,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    redeemedByPatientId: row.redeemed_by_patient_id,
    redeemedAt: row.redeemed_at,
    createdAt: row.created_at,
  };
}

export async function listDoctorInviteCodes(
  client: AppSupabaseClient,
): Promise<DoctorInviteCode[]> {
  const { data, error } = await client
    .from('doctor_invite_codes')
    .select(inviteColumns)
    .order('created_at', { ascending: false })
    .limit(12)
    .returns<DoctorInviteCodeRow[]>();

  if (error) throw error;
  return data.map(toDoctorInviteCode);
}

export async function createDoctorInviteCode(
  client: AppSupabaseClient,
): Promise<DoctorInviteCode> {
  const { data, error } = await client
    .rpc('create_doctor_invite_code')
    .single<Pick<DoctorInviteCodeRow, 'id' | 'code' | 'expires_at'>>();

  if (error) throw error;
  return toDoctorInviteCode({
    ...data,
    revoked_at: null,
    redeemed_by_patient_id: null,
    redeemed_at: null,
    created_at: new Date().toISOString(),
  });
}

export async function revokeDoctorInviteCode(
  client: AppSupabaseClient,
  inviteCodeId: string,
): Promise<boolean> {
  const { data, error } = await client.rpc('revoke_doctor_invite_code', {
    invite_code_id: inviteCodeId,
  });

  if (error) throw error;
  return data === true;
}

export async function listLinkedPatients(
  client: AppSupabaseClient,
): Promise<LinkedPatientSummary[]> {
  const { data: accessRows, error: accessError } = await client
    .from('doctor_patient_access')
    .select('id, patient_id, created_at')
    .eq('active', true)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .returns<DoctorPatientAccessRow[]>();

  if (accessError) throw accessError;
  if (!accessRows.length) return [];

  const patientIds = accessRows.map((row) => row.patient_id);
  const { data: profileRows, error: profileError } = await client
    .from('user_profiles')
    .select('id, role, display_name, consent_accepted_at')
    .in('id', patientIds)
    .returns<UserProfileRow[]>();

  if (profileError) throw profileError;

  const profilesById = new Map(profileRows.map((profile) => [profile.id, profile]));
  return accessRows.map((access) => ({
    accessId: access.id,
    patientId: access.patient_id,
    displayName: profilesById.get(access.patient_id)?.display_name ?? null,
    linkedAt: access.created_at,
  }));
}
