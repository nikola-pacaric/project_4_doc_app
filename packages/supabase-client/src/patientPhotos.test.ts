import { PHOTO_BUCKET, PHOTO_MIME_TYPE } from '@project4/photo';
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from './index';
import {
  createEntryPhotoSignedUrl,
  deleteQueuedEntryPhotos,
  deleteEntryPhotos,
  uploadPreparedEntryPhoto,
} from './patientPhotos';

function createUploadClientMock() {
  const single = vi.fn().mockResolvedValue({
    data: {
      id: '30000000-0000-4000-8000-000000000001',
      entry_id: '10000000-0000-4000-8000-000000000001',
      patient_id: '00000000-0000-4000-8000-000000000001',
      photo_path:
        'patients/00000000-0000-4000-8000-000000000001/entries/10000000-0000-4000-8000-000000000001/photos/photo-1.jpg',
      thumbnail_path:
        'patients/00000000-0000-4000-8000-000000000001/entries/10000000-0000-4000-8000-000000000001/thumbs/photo-1.jpg',
      original_filename: 'meal.jpg',
      mime_type: PHOTO_MIME_TYPE,
      width_px: 1280,
      height_px: 960,
      size_bytes: 320 * 1024,
      thumbnail_size_bytes: 32 * 1024,
      context_type: 'meal',
      context_label: 'Breakfast oatmeal',
      created_at: '2026-07-04T10:00:00.000Z',
    },
    error: null,
  });
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  const eq = vi.fn().mockResolvedValue({ error: null });
  const deleteRows = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ delete: deleteRows, insert }));
  const upload = vi.fn().mockResolvedValue({ data: { path: 'ok' }, error: null });
  const remove = vi.fn().mockResolvedValue({ data: [], error: null });
  const storageFrom = vi.fn(() => ({ remove, upload }));

  return {
    client: { from, storage: { from: storageFrom } } as unknown as AppSupabaseClient,
    deleteRows,
    eq,
    from,
    insert,
    remove,
    storageFrom,
    upload,
  };
}

function jpegBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  return bytes;
}

describe('uploadPreparedEntryPhoto', () => {
  it('validates metadata before uploading the compressed JPEG and thumbnail', async () => {
    const { client, from, insert, storageFrom, upload } = createUploadClientMock();
    const photoBody = jpegBytes(320 * 1024);
    const thumbnailBody = jpegBytes(32 * 1024);

    const result = await uploadPreparedEntryPhoto(client, {
      patientId: '00000000-0000-4000-8000-000000000001',
      entryId: '10000000-0000-4000-8000-000000000001',
      photoId: 'photo-1',
      photoBody,
      thumbnailBody,
      metadata: {
        originalFilename: 'meal.jpg',
        mimeType: PHOTO_MIME_TYPE,
        widthPx: 1280,
        heightPx: 960,
        sizeBytes: 320 * 1024,
        thumbnail: {
          widthPx: 320,
          heightPx: 240,
          sizeBytes: 32 * 1024,
        },
      },
      contextType: 'meal',
      contextLabel: 'Breakfast oatmeal',
    });

    expect(storageFrom).toHaveBeenCalledWith(PHOTO_BUCKET);
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload).toHaveBeenNthCalledWith(
      1,
      'patients/00000000-0000-4000-8000-000000000001/entries/10000000-0000-4000-8000-000000000001/photos/photo-1.jpg',
      expect.any(Uint8Array),
      { contentType: PHOTO_MIME_TYPE, upsert: false },
    );
    expect(upload).toHaveBeenNthCalledWith(
      2,
      'patients/00000000-0000-4000-8000-000000000001/entries/10000000-0000-4000-8000-000000000001/thumbs/photo-1.jpg',
      expect.any(Uint8Array),
      { contentType: PHOTO_MIME_TYPE, upsert: false },
    );
    expect(from).toHaveBeenCalledWith('entry_photos');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        mime_type: PHOTO_MIME_TYPE,
        width_px: 1280,
        size_bytes: 320 * 1024,
        thumbnail_size_bytes: 32 * 1024,
        context_type: 'meal',
        context_label: 'Breakfast oatmeal',
      }),
    );
    expect(result.photoPath).toContain('/photos/photo-1.jpg');
    expect(insert.mock.invocationCallOrder[0]!).toBeLessThan(upload.mock.invocationCallOrder[0]!);
  });

  it('rejects invalid original-width metadata before upload', async () => {
    const { client, upload, insert } = createUploadClientMock();

    await expect(
      uploadPreparedEntryPhoto(client, {
        patientId: '00000000-0000-4000-8000-000000000001',
        entryId: '10000000-0000-4000-8000-000000000001',
        photoId: 'photo-1',
        photoBody: jpegBytes(320 * 1024),
        thumbnailBody: jpegBytes(32 * 1024),
        metadata: {
          mimeType: PHOTO_MIME_TYPE,
          widthPx: 1281,
          heightPx: 960,
          sizeBytes: 320 * 1024,
          thumbnail: {
            widthPx: 320,
            heightPx: 240,
            sizeBytes: 32 * 1024,
          },
        },
        contextType: 'meal',
      }),
    ).rejects.toThrow('PHOTO_WIDTH_TOO_LARGE');

    expect(upload).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('rejects tiny or non-JPEG payloads before upload', async () => {
    const { client, upload, insert } = createUploadClientMock();

    await expect(
      uploadPreparedEntryPhoto(client, {
        patientId: '00000000-0000-4000-8000-000000000001',
        entryId: '10000000-0000-4000-8000-000000000001',
        photoId: 'photo-1',
        photoBody: new Uint8Array(14),
        thumbnailBody: new Uint8Array(14),
        metadata: {
          mimeType: PHOTO_MIME_TYPE,
          widthPx: 1280,
          heightPx: 960,
          sizeBytes: 14,
          thumbnail: {
            widthPx: 320,
            heightPx: 240,
            sizeBytes: 14,
          },
        },
        contextType: 'meal',
      }),
    ).rejects.toThrow('PHOTO_SIZE_TOO_SMALL');

    expect(upload).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('rejects payloads that do not match metadata size', async () => {
    const { client, upload, insert } = createUploadClientMock();

    await expect(
      uploadPreparedEntryPhoto(client, {
        patientId: '00000000-0000-4000-8000-000000000001',
        entryId: '10000000-0000-4000-8000-000000000001',
        photoId: 'photo-1',
        photoBody: jpegBytes(2048),
        thumbnailBody: jpegBytes(2048),
        metadata: {
          mimeType: PHOTO_MIME_TYPE,
          widthPx: 1280,
          heightPx: 960,
          sizeBytes: 320 * 1024,
          thumbnail: {
            widthPx: 320,
            heightPx: 240,
            sizeBytes: 32 * 1024,
          },
        },
        contextType: 'meal',
      }),
    ).rejects.toThrow('PHOTO_BODY_SIZE_MISMATCH');

    expect(upload).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('does not create storage objects when metadata validation fails', async () => {
    const { client, remove, upload } = createUploadClientMock();
    const failingSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: new Error('insert failed') });
    const failingSelect = vi.fn(() => ({ single: failingSingle }));
    const failingInsert = vi.fn(() => ({ select: failingSelect }));
    vi.mocked(client.from).mockReturnValue({ insert: failingInsert } as never);

    await expect(
      uploadPreparedEntryPhoto(client, {
        patientId: '00000000-0000-4000-8000-000000000001',
        entryId: '10000000-0000-4000-8000-000000000001',
        photoId: 'photo-1',
        photoBody: jpegBytes(320 * 1024),
        thumbnailBody: jpegBytes(32 * 1024),
        metadata: {
          mimeType: PHOTO_MIME_TYPE,
          widthPx: 1280,
          heightPx: 960,
          sizeBytes: 320 * 1024,
          thumbnail: {
            widthPx: 320,
            heightPx: 240,
            sizeBytes: 32 * 1024,
          },
        },
        contextType: 'meal',
      }),
    ).rejects.toThrow('insert failed');

    expect(upload).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('removes partial uploads and metadata when the thumbnail upload fails', async () => {
    const { client, deleteRows, eq, remove, upload } = createUploadClientMock();
    upload
      .mockResolvedValueOnce({ data: { path: 'photo' }, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('thumbnail failed') });

    await expect(
      uploadPreparedEntryPhoto(client, {
        patientId: '00000000-0000-4000-8000-000000000001',
        entryId: '10000000-0000-4000-8000-000000000001',
        photoId: 'photo-1',
        photoBody: jpegBytes(320 * 1024),
        thumbnailBody: jpegBytes(32 * 1024),
        metadata: {
          mimeType: PHOTO_MIME_TYPE,
          widthPx: 1280,
          heightPx: 960,
          sizeBytes: 320 * 1024,
          thumbnail: { widthPx: 320, heightPx: 240, sizeBytes: 32 * 1024 },
        },
        contextType: 'meal',
      }),
    ).rejects.toThrow('thumbnail failed');

    expect(remove).toHaveBeenCalledWith([
      'patients/00000000-0000-4000-8000-000000000001/entries/10000000-0000-4000-8000-000000000001/photos/photo-1.jpg',
    ]);
    expect(deleteRows).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith('id', '30000000-0000-4000-8000-000000000001');
  });
});

describe('createEntryPhotoSignedUrl', () => {
  it('creates a short-lived signed URL for private photo previews', async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://example.test/signed-thumbnail' },
      error: null,
    });
    const storageFrom = vi.fn(() => ({ createSignedUrl }));
    const client = { storage: { from: storageFrom } } as unknown as AppSupabaseClient;

    await expect(createEntryPhotoSignedUrl(client, 'private/thumb.jpg')).resolves.toBe(
      'https://example.test/signed-thumbnail',
    );

    expect(storageFrom).toHaveBeenCalledWith(PHOTO_BUCKET);
    expect(createSignedUrl).toHaveBeenCalledWith('private/thumb.jpg', 300);
  });
});

describe('deleteEntryPhotos', () => {
  it('removes private objects before deleting photo metadata', async () => {
    const remove = vi.fn().mockResolvedValue({ data: [], error: null });
    const inFilter = vi.fn().mockResolvedValue({ error: null });
    const deleteRows = vi.fn(() => ({ in: inFilter }));
    const from = vi.fn(() => ({ delete: deleteRows }));
    const storageFrom = vi.fn(() => ({ remove }));
    const client = { from, storage: { from: storageFrom } } as unknown as AppSupabaseClient;

    await deleteEntryPhotos(client, [
      {
        id: 'photo-row-1',
        photoPath: 'patients/patient-1/entries/entry-1/photos/photo-1.jpg',
        thumbnailPath: 'patients/patient-1/entries/entry-1/thumbs/photo-1.jpg',
      },
    ]);

    expect(storageFrom).toHaveBeenCalledWith(PHOTO_BUCKET);
    expect(remove).toHaveBeenCalledWith([
      'patients/patient-1/entries/entry-1/photos/photo-1.jpg',
      'patients/patient-1/entries/entry-1/thumbs/photo-1.jpg',
    ]);
    expect(from).toHaveBeenCalledWith('entry_photos');
    expect(deleteRows).toHaveBeenCalled();
    expect(inFilter).toHaveBeenCalledWith('id', ['photo-row-1']);
  });
});

describe('deleteQueuedEntryPhotos', () => {
  it('deletes metadata for current items while supporting legacy path-only items', async () => {
    const remove = vi.fn().mockResolvedValue({ data: [], error: null });
    const inFilter = vi.fn().mockResolvedValue({ error: null });
    const deleteRows = vi.fn(() => ({ in: inFilter }));
    const from = vi.fn(() => ({ delete: deleteRows }));
    const storageFrom = vi.fn(() => ({ remove }));
    const client = { from, storage: { from: storageFrom } } as unknown as AppSupabaseClient;

    await deleteQueuedEntryPhotos(client, [
      {
        id: 'photo-row-1',
        photoPath: 'patients/patient-1/entries/entry-1/photos/photo-1.jpg',
        thumbnailPath: 'patients/patient-1/entries/entry-1/thumbs/photo-1.jpg',
      },
      {
        photoPath: 'patients/patient-1/entries/entry-1/photos/legacy.jpg',
        thumbnailPath: 'patients/patient-1/entries/entry-1/thumbs/legacy.jpg',
      },
    ]);

    expect(remove).toHaveBeenNthCalledWith(1, [
      'patients/patient-1/entries/entry-1/photos/photo-1.jpg',
      'patients/patient-1/entries/entry-1/thumbs/photo-1.jpg',
    ]);
    expect(inFilter).toHaveBeenCalledWith('id', ['photo-row-1']);
    expect(remove).toHaveBeenNthCalledWith(2, [
      'patients/patient-1/entries/entry-1/photos/legacy.jpg',
      'patients/patient-1/entries/entry-1/thumbs/legacy.jpg',
    ]);
  });
});
