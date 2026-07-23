import { PHOTO_MIME_TYPE } from '@project4/photo';
import { type EntryPhoto } from '@project4/supabase-client';
import { describe, expect, it, vi } from 'vitest';

import { withSignedThumbnailUris } from './persistedPhotos';

describe('withSignedThumbnailUris', () => {
  it('preserves exact deletion metadata while adding signed thumbnail URLs', async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://signed.example/thumb.jpg' },
      error: null,
    });
    const client = {
      storage: { from: vi.fn(() => ({ createSignedUrl })) },
    } as never;
    const photos: EntryPhoto[] = [
      {
        id: 'photo-1',
        entryId: 'entry-1',
        patientId: 'patient-1',
        photoPath: 'patients/patient-1/entries/entry-1/photos/photo-1.jpg',
        thumbnailPath: 'patients/patient-1/entries/entry-1/thumbs/photo-1.jpg',
        originalFilename: null,
        mimeType: PHOTO_MIME_TYPE,
        widthPx: 100,
        heightPx: 100,
        sizeBytes: 1000,
        thumbnailSizeBytes: 100,
        contextType: 'meal',
        contextLabel: null,
        createdAt: '2026-07-23T10:00:00.000Z',
      },
    ];

    await expect(withSignedThumbnailUris(client, photos)).resolves.toEqual([
      {
        id: 'photo-1',
        photoPath: 'patients/patient-1/entries/entry-1/photos/photo-1.jpg',
        thumbnailPath: 'patients/patient-1/entries/entry-1/thumbs/photo-1.jpg',
        uri: 'https://signed.example/thumb.jpg',
      },
    ]);
    expect(createSignedUrl).toHaveBeenCalledWith(photos[0]!.thumbnailPath, 300);
  });
});
