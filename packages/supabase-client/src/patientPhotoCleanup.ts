import { PHOTO_BUCKET } from '@project4/photo';

import type { AppSupabaseClient } from './index';

const CLEANUP_BATCH_LIMIT = 100;
const MAX_CLEANUP_BATCHES_PER_DRAIN = 10;

export interface PendingPatientPhotoCleanup {
  jobId: string;
  photoId: string;
  photoPath: string;
  thumbnailPath: string;
}

interface PendingPatientPhotoCleanupRow {
  job_id: string;
  photo_id: string;
  photo_path: string;
  thumbnail_path: string;
}

function isCleanupRow(value: unknown): value is PendingPatientPhotoCleanupRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<PendingPatientPhotoCleanupRow>;
  return (
    typeof row.job_id === 'string' &&
    row.job_id.length > 0 &&
    typeof row.photo_id === 'string' &&
    row.photo_id.length > 0 &&
    typeof row.photo_path === 'string' &&
    row.photo_path.length > 0 &&
    typeof row.thumbnail_path === 'string' &&
    row.thumbnail_path.length > 0
  );
}

export async function listPendingPatientPhotoCleanups(
  client: AppSupabaseClient,
): Promise<PendingPatientPhotoCleanup[]> {
  const { data, error } = await client.rpc('list_pending_patient_photo_cleanups');
  if (error) throw error;
  if (!Array.isArray(data) || !data.every(isCleanupRow)) {
    throw new Error('Pending photo cleanup returned invalid data.');
  }

  return data.map((row) => ({
    jobId: row.job_id,
    photoId: row.photo_id,
    photoPath: row.photo_path,
    thumbnailPath: row.thumbnail_path,
  }));
}

export async function completePatientPhotoCleanups(
  client: AppSupabaseClient,
  jobIds: readonly string[],
): Promise<void> {
  if (!jobIds.length) return;
  const { error } = await client.rpc('complete_patient_photo_cleanups', {
    p_job_ids: [...new Set(jobIds)],
  });
  if (error) throw error;
}

/**
 * Storage cannot participate in the Postgres transaction. The private outbox
 * makes this sequence retryable across crashes: remove objects, then atomically
 * remove any retained metadata and acknowledge the durable jobs.
 */
export async function drainPendingPatientPhotoCleanups(client: AppSupabaseClient): Promise<number> {
  let completedCount = 0;

  for (let batch = 0; batch < MAX_CLEANUP_BATCHES_PER_DRAIN; batch += 1) {
    const jobs = await listPendingPatientPhotoCleanups(client);
    if (!jobs.length) return completedCount;

    const paths = [...new Set(jobs.flatMap((job) => [job.photoPath, job.thumbnailPath]))];
    const { error: storageError } = await client.storage.from(PHOTO_BUCKET).remove(paths);
    if (storageError) throw storageError;

    await completePatientPhotoCleanups(
      client,
      jobs.map((job) => job.jobId),
    );
    completedCount += jobs.length;

    if (jobs.length < CLEANUP_BATCH_LIMIT) return completedCount;
  }

  throw new Error('Pending photo cleanup backlog exceeds the safe drain limit.');
}
