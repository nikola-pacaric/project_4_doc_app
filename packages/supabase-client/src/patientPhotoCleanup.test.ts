import { PHOTO_BUCKET } from '@project4/photo';
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from './index';
import {
  completePatientPhotoCleanups,
  drainPendingPatientPhotoCleanups,
  listPendingPatientPhotoCleanups,
} from './patientPhotoCleanup';

function createClientMock() {
  const remove = vi.fn().mockResolvedValue({ data: [], error: null });
  const storageFrom = vi.fn(() => ({ remove }));
  const rpc = vi.fn();
  const client = { rpc, storage: { from: storageFrom } } as unknown as AppSupabaseClient;
  return { client, remove, rpc, storageFrom };
}

const row = {
  job_id: 'job-1',
  photo_id: 'photo-1',
  photo_path: 'patients/patient-1/entries/entry-1/photos/photo-1.jpg',
  thumbnail_path: 'patients/patient-1/entries/entry-1/thumbs/photo-1.jpg',
};

describe('patient photo cleanup outbox', () => {
  it('maps only valid patient cleanup rows', async () => {
    const { client, rpc } = createClientMock();
    rpc.mockResolvedValueOnce({ data: [row], error: null });

    await expect(listPendingPatientPhotoCleanups(client)).resolves.toEqual([
      {
        jobId: 'job-1',
        photoId: 'photo-1',
        photoPath: row.photo_path,
        thumbnailPath: row.thumbnail_path,
      },
    ]);
  });

  it('rejects malformed cleanup data without touching Storage', async () => {
    const { client, remove, rpc } = createClientMock();
    rpc.mockResolvedValueOnce({ data: [{ ...row, job_id: null }], error: null });

    await expect(listPendingPatientPhotoCleanups(client)).rejects.toThrow(
      'Pending photo cleanup returned invalid data.',
    );
    expect(remove).not.toHaveBeenCalled();
  });

  it('removes both objects before atomically completing the jobs', async () => {
    const { client, remove, rpc, storageFrom } = createClientMock();
    rpc
      .mockResolvedValueOnce({ data: [row], error: null })
      .mockResolvedValueOnce({ data: undefined, error: null });

    await expect(drainPendingPatientPhotoCleanups(client)).resolves.toBe(1);

    expect(storageFrom).toHaveBeenCalledWith(PHOTO_BUCKET);
    expect(remove).toHaveBeenCalledWith([row.photo_path, row.thumbnail_path]);
    expect(rpc).toHaveBeenNthCalledWith(2, 'complete_patient_photo_cleanups', {
      p_job_ids: ['job-1'],
    });
  });

  it('retains the durable job when Storage deletion fails', async () => {
    const { client, remove, rpc } = createClientMock();
    rpc.mockResolvedValueOnce({ data: [row], error: null });
    remove.mockResolvedValueOnce({ data: null, error: new Error('storage unavailable') });

    await expect(drainPendingPatientPhotoCleanups(client)).rejects.toThrow('storage unavailable');
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('deduplicates completion ids', async () => {
    const { client, rpc } = createClientMock();
    rpc.mockResolvedValueOnce({ data: undefined, error: null });

    await completePatientPhotoCleanups(client, ['job-1', 'job-1']);

    expect(rpc).toHaveBeenCalledWith('complete_patient_photo_cleanups', {
      p_job_ids: ['job-1'],
    });
  });
});
