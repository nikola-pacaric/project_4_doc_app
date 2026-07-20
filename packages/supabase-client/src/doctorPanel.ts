import type {
  ExportMode,
  ExportPayload,
  ExportRange,
  PatientBaselineProfile,
  PatientEntry,
} from '@project4/contracts';
import { NO_STOOL_TODAY_TEXT, validateExportPayload } from '@project4/contracts';
import { PHOTO_BUCKET } from '@project4/photo';

import type { AppSupabaseClient } from './index';
import type { Database } from './database.types';
import { listDoctorTimelineEntries, type DoctorTimelineEntry } from './doctorTimeline';
import { getPatientBaseline } from './patientBaseline';
import { createStoredZipBytes, type ZipFileInput } from './zipBundle';

export interface DoctorInviteCode {
  id: string;
  code: string;
  expiresAt: string;
  revokedAt: string | null;
  redeemedByPatientId: string | null;
  redeemedAt: string | null;
  createdAt: string;
}

type DoctorInviteCodeRow = Pick<
  Database['public']['Tables']['doctor_invite_codes']['Row'],
  | 'id'
  | 'code'
  | 'expires_at'
  | 'revoked_at'
  | 'redeemed_by_patient_id'
  | 'redeemed_at'
  | 'created_at'
>;

export interface LinkedPatientSummary {
  accessId: string;
  patientId: string;
  displayName: string | null;
  linkedAt: string;
  adherence: DoctorPatientAdherenceSummary;
}

export interface DoctorLinkedPatientTimeline {
  patient: LinkedPatientSummary;
  baseline: PatientBaselineProfile | null;
  entries: DoctorTimelineEntry[];
  adherence: DoctorPatientAdherenceSummary;
}

export type DoctorDayStatus = 'submitted' | 'in_progress' | 'day_ended_incomplete' | 'no_activity';

export type DoctorCheckpointStatus = 'recorded' | 'none' | 'missing';

export interface DoctorAdherenceDay {
  date: string;
  status: DoctorDayStatus;
  symptomStatus: DoctorCheckpointStatus;
  stoolStatus: DoctorCheckpointStatus;
}

export interface DoctorPatientAdherenceSummary {
  days: DoctorAdherenceDay[];
  submittedDays: number;
  totalDays: number;
}

export interface DoctorAdherenceEvent {
  occurredAt: string;
  kind: PatientEntry['kind'];
  text: string | null;
  dailyCompletedAt: string | null;
  symptomType: string | null;
}

export interface CreateDoctorExportInput {
  patientId: string;
  mode: ExportMode;
  range: ExportRange;
  imageBytesLoader?: (storagePath: string) => Promise<Uint8Array>;
}

export interface DoctorPatientExportBundle {
  fileName: string;
  zipBytes: Uint8Array;
  payload: ExportPayload;
  imageFileCount: number;
}

type DoctorPatientAccessRow = Pick<
  Database['public']['Tables']['doctor_patient_access']['Row'],
  'id' | 'patient_id' | 'created_at'
>;

type UserProfileRow = Pick<
  Database['public']['Tables']['user_profiles']['Row'],
  'id' | 'role' | 'display_name' | 'consent_accepted_at'
>;

const inviteColumns =
  'id, code, expires_at, revoked_at, redeemed_by_patient_id, redeemed_at, created_at';

const adherenceTimeZone = 'Europe/Belgrade';
const adherenceDayCount = 7;

type DoctorAdherenceEntryRow = Pick<
  Database['public']['Tables']['patient_entries']['Row'],
  'patient_id' | 'occurred_at' | 'kind' | 'text'
> & {
  daily_details: Pick<
    Database['public']['Tables']['daily_form_details']['Row'],
    'completed_at'
  > | null;
  symptom_details: Pick<
    Database['public']['Tables']['symptom_details']['Row'],
    'symptom_type'
  > | null;
};

const adherenceEntryColumns = `
  patient_id,
  occurred_at,
  kind,
  text,
  daily_details:daily_form_details(completed_at),
  symptom_details:symptom_details(symptom_type)
`;

function dateKey(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: adherenceTimeZone,
    year: 'numeric',
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function recentDateKeys(now: Date, days: number): string[] {
  const today = dateKey(now);
  const cursor = new Date(`${today}T12:00:00.000Z`);
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(cursor);
    day.setUTCDate(cursor.getUTCDate() - index);
    return day.toISOString().slice(0, 10);
  });
}

export function buildDoctorPatientAdherence(
  events: DoctorAdherenceEvent[],
  now = new Date(),
  days = adherenceDayCount,
): DoctorPatientAdherenceSummary {
  const dates = recentDateKeys(now, days);
  const today = dates[0];
  const dateSet = new Set(dates);
  const eventsByDate = new Map<string, DoctorAdherenceEvent[]>();

  for (const event of events) {
    const key = dateKey(new Date(event.occurredAt));
    if (!dateSet.has(key)) continue;
    eventsByDate.set(key, [...(eventsByDate.get(key) ?? []), event]);
  }

  const adherenceDays = dates.map((date): DoctorAdherenceDay => {
    const dayEvents = eventsByDate.get(date) ?? [];
    const submitted = dayEvents.some((event) => event.dailyCompletedAt !== null);
    const symptomTypes = dayEvents
      .map((event) => event.symptomType)
      .filter((type): type is string => type !== null);
    const symptomStatus: DoctorCheckpointStatus = symptomTypes.some((type) => type !== 'none')
      ? 'recorded'
      : symptomTypes.includes('none')
        ? 'none'
        : 'missing';
    const stoolStatus: DoctorCheckpointStatus = dayEvents.some((event) => event.kind === 'stool')
      ? 'recorded'
      : dayEvents.some(
            (event) => event.kind === 'note' && event.text?.trim() === NO_STOOL_TODAY_TEXT,
          )
        ? 'none'
        : 'missing';

    return {
      date,
      status: submitted
        ? 'submitted'
        : dayEvents.length
          ? date === today
            ? 'in_progress'
            : 'day_ended_incomplete'
          : 'no_activity',
      symptomStatus,
      stoolStatus,
    };
  });

  return {
    days: adherenceDays,
    submittedDays: adherenceDays.filter((day) => day.status === 'submitted').length,
    totalDays: adherenceDays.length,
  };
}

function toAdherenceEvent(row: DoctorAdherenceEntryRow): DoctorAdherenceEvent {
  return {
    occurredAt: row.occurred_at,
    kind: row.kind,
    text: row.text,
    dailyCompletedAt: row.daily_details?.completed_at ?? null,
    symptomType: row.symptom_details?.symptom_type ?? null,
  };
}

function timelineAdherenceEvent(entry: DoctorTimelineEntry): DoctorAdherenceEvent {
  return {
    occurredAt: entry.occurredAt,
    kind: entry.kind,
    text: entry.text,
    dailyCompletedAt: entry.medicalDetails.daily?.completedAt ?? null,
    symptomType: entry.medicalDetails.symptom?.type ?? null,
  };
}

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

export async function createDoctorInviteCode(client: AppSupabaseClient): Promise<DoctorInviteCode> {
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

/** Active doctor link for a patient. Does not expose doctor identity fields. */
export interface PatientDoctorLink {
  accessId: string;
  linkedAt: string;
}

export async function getPatientDoctorLink(
  client: AppSupabaseClient,
  patientId: string,
): Promise<PatientDoctorLink | null> {
  const { data, error } = await client
    .from('doctor_patient_access')
    .select('id, created_at')
    .eq('patient_id', patientId)
    .eq('active', true)
    .is('revoked_at', null)
    .maybeSingle<Pick<DoctorPatientAccessRow, 'id' | 'created_at'>>();

  if (error) throw error;
  if (!data) return null;

  return {
    accessId: data.id,
    linkedAt: data.created_at,
  };
}

export async function listLinkedPatients(
  client: AppSupabaseClient,
  now = new Date(),
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
  const queryStart = new Date(now);
  queryStart.setUTCDate(queryStart.getUTCDate() - (adherenceDayCount + 1));
  const [profileResult, adherenceResult] = await Promise.all([
    client
      .from('user_profiles')
      .select('id, role, display_name, consent_accepted_at')
      .in('id', patientIds)
      .returns<UserProfileRow[]>(),
    client
      .from('patient_entries')
      .select(adherenceEntryColumns)
      .in('patient_id', patientIds)
      .gte('occurred_at', queryStart.toISOString())
      .returns<DoctorAdherenceEntryRow[]>(),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (adherenceResult.error) throw adherenceResult.error;

  const profilesById = new Map((profileResult.data ?? []).map((profile) => [profile.id, profile]));
  const adherenceByPatient = new Map<string, DoctorAdherenceEvent[]>();
  for (const row of adherenceResult.data ?? []) {
    adherenceByPatient.set(row.patient_id, [
      ...(adherenceByPatient.get(row.patient_id) ?? []),
      toAdherenceEvent(row),
    ]);
  }

  return accessRows.map((access) => ({
    accessId: access.id,
    patientId: access.patient_id,
    displayName: profilesById.get(access.patient_id)?.display_name ?? null,
    linkedAt: access.created_at,
    adherence: buildDoctorPatientAdherence(adherenceByPatient.get(access.patient_id) ?? [], now),
  }));
}

export async function getDoctorLinkedPatientTimeline(
  client: AppSupabaseClient,
  patientId: string,
  days = 30,
  now = new Date(),
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

  const [profileResult, baseline, entries] = await Promise.all([
    client
      .from('user_profiles')
      .select('id, role, display_name, consent_accepted_at')
      .eq('id', patientId)
      .maybeSingle<UserProfileRow>(),
    getPatientBaseline(client, patientId),
    listDoctorTimelineEntries(client, patientId, days),
  ]);

  if (profileResult.error) throw profileResult.error;
  const profileRow = profileResult.data;

  const adherence = buildDoctorPatientAdherence(entries.map(timelineAdherenceEvent), now);
  const patient = {
    accessId: accessRow.id,
    patientId: accessRow.patient_id,
    displayName: profileRow?.display_name ?? null,
    linkedAt: accessRow.created_at,
    adherence,
  };

  return {
    patient,
    baseline,
    entries,
    adherence,
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
    selected_date: input.range.type === 'selected_day' ? input.range.date : undefined,
    selected_month: input.range.type === 'partial_month' ? input.range.month : undefined,
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
      : input.range.type === 'partial_month'
        ? input.range.month.slice(0, 7)
        : 'all-time';
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
  const usedZipPaths = new Set<string>();
  const loadImageBytes =
    input.imageBytesLoader ??
    (async (imagePath: string): Promise<Uint8Array> => {
      const { data, error } = await client.storage.from(PHOTO_BUCKET).download(imagePath);
      if (error) throw error;
      if (!data) throw new Error('EXPORT_IMAGE_DOWNLOAD_EMPTY');
      return blobToBytes(data);
    });

  for (const imagePath of imagePaths) {
    files.push({
      path: zipPathForStoragePath(imagePath, usedZipPaths),
      bytes: await loadImageBytes(imagePath),
    });
  }

  return {
    fileName: exportFileName(input, payload),
    zipBytes: createStoredZipBytes(files),
    payload,
    imageFileCount: imagePaths.length,
  };
}
