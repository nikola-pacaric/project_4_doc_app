import { PHOTO_BUCKET, PHOTO_MIME_TYPE } from '@project4/photo';
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from './index';
import { createEntryPhotoSignedUrl, deleteEntryPhotos, uploadPreparedEntryPhoto } from './patientPhotos';

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
  const from = vi.fn(() => ({ insert }));
  const upload = vi.fn().mockResolvedValue({ data: { path: 'ok' }, error: null });
  const remove = vi.fn().mockResolvedValue({ data: [], error: null });
  const storageFrom = vi.fn(() => ({ remove, upload }));

  return {
    client: { from, storage: { from: storageFrom } } as unknown as AppSupabaseClient,
    from,
    insert,
    remove,
    storageFrom,
    upload,
  };
}

describe('uploadPreparedEntryPhoto', () => {
  it('uploads compressed JPEG and thumbnail before inserting metadata', async () => {
    const { client, from, insert, storageFrom, upload } = createUploadClientMock();

    const result = await uploadPreparedEntryPhoto(client, {
      patientId: '00000000-0000-4000-8000-000000000001',
      entryId: '10000000-0000-4000-8000-000000000001',
      photoId: 'photo-1',
      photoBody: new Uint8Array([1, 2, 3]),
      thumbnailBody: new Uint8Array([4, 5, 6]),
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
  });

  it('rejects invalid original-width metadata before upload', async () => {
    const { client, upload, insert } = createUploadClientMock();

    await expect(
      uploadPreparedEntryPhoto(client, {
        patientId: '00000000-0000-4000-8000-000000000001',
        entryId: '10000000-0000-4000-8000-000000000001',
        photoId: 'photo-1',
        photoBody: new Uint8Array([1]),
        thumbnailBody: new Uint8Array([2]),
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
      }),
    ).rejects.toThrow('PHOTO_WIDTH_TOO_LARGE');

    expect(upload).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('removes uploaded objects when metadata insert fails', async () => {
    const { client, remove } = createUploadClientMock();
    const failingSingle = vi.fn().mockResolvedValue({ data: null, error: new Error('insert failed') });
    const failingSelect = vi.fn(() => ({ single: failingSingle }));
    const failingInsert = vi.fn(() => ({ select: failingSelect }));
    vi.mocked(client.from).mockReturnValue({ insert: failingInsert } as never);

    await expect(
      uploadPreparedEntryPhoto(client, {
        patientId: '00000000-0000-4000-8000-000000000001',
        entryId: '10000000-0000-4000-8000-000000000001',
        photoId: 'photo-1',
        photoBody: new Uint8Array([1, 2, 3]),
        thumbnailBody: new Uint8Array([4, 5, 6]),
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
      }),
    ).rejects.toThrow('insert failed');

    expect(remove).toHaveBeenCalledWith([
      'patients/00000000-0000-4000-8000-000000000001/entries/10000000-0000-4000-8000-000000000001/photos/photo-1.jpg',
      'patients/00000000-0000-4000-8000-000000000001/entries/10000000-0000-4000-8000-000000000001/thumbs/photo-1.jpg',
    ]);
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
