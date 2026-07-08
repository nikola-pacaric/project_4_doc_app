import type { ExportMode, ExportPayload, ExportRange, UserProfile } from '@project4/contracts';
import type { PatientEntry } from '@project4/contracts';
import { validateExportPayload } from '@project4/contracts';
import { PHOTO_BUCKET } from '@project4/photo';

import type { AppSupabaseClient } from './index';
import { listRecentPatientEntries } from './patientEntries';
import { createStoredZip, type ZipFileInput } from './zipBundle';

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

export interface DoctorLinkedPatientTimeline {
  patient: LinkedPatientSummary;
  entries: PatientEntry[];
}

export interface CreateDoctorExportInput {
  patientId: string;
  mode: ExportMode;
  range: ExportRange;
}

export interface DoctorPatientExportBundle {
  fileName: string;
  zipBlob: Blob;
  payload: ExportPayload;
  imageFileCount: number;
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
  return (data ?? []).map(toDoctorInviteCode);
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

export async function redeemDoctorInviteCode(
  client: AppSupabaseClient,
  inviteCode: string,
): Promise<string> {
  const { data, error } = await client.rpc('redeem_doctor_invite_code', {
    invite_code: inviteCode.trim().toUpperCase(),
  });

  if (error) throw error;
  return data as string;
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
  if (!accessRows?.length) return [];

  const patientIds = accessRows.map((row) => row.patient_id);
  const { data: profileRows, error: profileError } = await client
    .from('user_profiles')
    .select('id, role, display_name, consent_accepted_at')
    .in('id', patientIds)
    .returns<UserProfileRow[]>();

  if (profileError) throw profileError;

  const profilesById = new Map((profileRows ?? []).map((profile) => [profile.id, profile]));
  return accessRows.map((access) => ({
    accessId: access.id,
    patientId: access.patient_id,
    displayName: profilesById.get(access.patient_id)?.display_name ?? null,
    linkedAt: access.created_at,
  }));
}

export async function getDoctorLinkedPatientTimeline(
  client: AppSupabaseClient,
  patientId: string,
  days = 30,
): Promise<DoctorLinkedPatientTimeline> {
  const { data: accessRow, error: accessError } = await client
    .from('doctor_patient_access')
    .select('id, patient_id, created_at')
    .eq('patient_id', patientId)
    .eq('active', true)
    .is('revoked_at', null)
    .maybeSingle<DoctorPatientAccessRow>();

  if (accessError) throw accessError;
  if (!accessRow) throw new Error('DOCTOR_PATIENT_ACCESS_REQUIRED');

  const { data: profileRow, error: profileError } = await client
    .from('user_profiles')
    .select('id, role, display_name, consent_accepted_at')
    .eq('id', patientId)
    .maybeSingle<UserProfileRow>();

  if (profileError) throw profileError;

  const entries = await listRecentPatientEntries(client, patientId, days);
  return {
    patient: {
      accessId: accessRow.id,
      patientId: accessRow.patient_id,
      displayName: profileRow?.display_name ?? null,
      linkedAt: accessRow.created_at,
    },
    entries,
  };
}

export async function createDoctorPatientExport(
  client: AppSupabaseClient,
  input: CreateDoctorExportInput,
): Promise<ExportPayload> {
  const { data, error } = await client.rpc('export_patient_data', {
    target_patient_id: input.patientId,
    export_mode: input.mode,
    export_range_type: input.range.type,
    selected_date: input.range.type === 'selected_day' ? input.range.date : null,
    selected_month: input.range.type === 'partial_month' ? input.range.month : null,
  });

  if (error) throw error;
  return validateExportPayload(data);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function collectExportImagePaths(value: unknown, paths = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((item) => collectExportImagePaths(item, paths));
    return paths;
  }

  if (!isRecord(value)) return paths;

  const photoPath = value.photoPath;
  const thumbnailPath = value.thumbnailPath;
  if (typeof photoPath === 'string') paths.add(photoPath);
  if (typeof thumbnailPath === 'string') paths.add(thumbnailPath);

  Object.values(value).forEach((item) => collectExportImagePaths(item, paths));
  return paths;
}

function safeZipSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^_+/, '') || 'file';
}

function zipPathForStoragePath(storagePath: string, usedNames: Set<string>): string {
  const parts = storagePath.split('/');
  const folder = parts.includes('thumbs') ? 'thumbs' : 'images';
  const fileName = safeZipSegment(parts.at(-1) ?? 'image.jpg');
  let zipPath = `${folder}/${fileName}`;
  let suffix = 2;

  while (usedNames.has(zipPath)) {
    zipPath = `${folder}/${fileName.replace(/\.jpg$/i, '')}-${suffix}.jpg`;
    suffix += 1;
  }

  usedNames.add(zipPath);
  return zipPath;
}

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

function exportFileName(input: CreateDoctorExportInput, payload: ExportPayload): string {
  const rangeLabel =
    input.range.type === 'selected_day'
      ? input.range.date
      : input.range.month.slice(0, 7);
  return `patient-export-${payload.patientId.slice(0, 8)}-${rangeLabel}-${input.mode}.zip`;
}

export async function createDoctorPatientExportBundle(
  client: AppSupabaseClient,
  input: CreateDoctorExportInput,
): Promise<DoctorPatientExportBundle> {
  const payload = await createDoctorPatientExport(client, input);
  const files: ZipFileInput[] = [
    {
      path: 'export.json',
      bytes: new TextEncoder().encode(JSON.stringify(payload, null, 2)),
    },
  ];

  const imagePaths =
    input.mode === 'all_data' ? [] : Array.from(collectExportImagePaths(payload)).sort();
  const bucket = client.storage.from(PHOTO_BUCKET);
  const usedZipPaths = new Set<string>();

  for (const imagePath of imagePaths) {
    const { data, error } = await bucket.download(imagePath);
    if (error) throw error;
    if (!data) throw new Error('EXPORT_IMAGE_DOWNLOAD_EMPTY');

    files.push({
      path: zipPathForStoragePath(imagePath, usedZipPaths),
      bytes: await blobToBytes(data),
    });
  }

  return {
    fileName: exportFileName(input, payload),
    zipBlob: createStoredZip(files),
    payload,
    imageFileCount: imagePaths.length,
  };
}
