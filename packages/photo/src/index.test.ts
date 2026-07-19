import { describe, expect, it } from 'vitest';

import {
  PHOTO_MIME_TYPE,
  buildEntryPhotoPaths,
  createPhotoId,
  validateEntryPhotoPaths,
  validatePreparedPhotoMetadata,
} from './index';

describe('photo storage paths', () => {
  it('builds private patient entry photo and thumbnail paths', () => {
    expect(buildEntryPhotoPaths('patient-1', 'entry-1', 'photo-1')).toEqual({
      photoPath: 'patients/patient-1/entries/entry-1/photos/photo-1.jpg',
      thumbnailPath: 'patients/patient-1/entries/entry-1/thumbs/photo-1.jpg',
    });
  });

  it('rejects paths outside the patient entry prefix and base64 markers', () => {
    expect(
      validateEntryPhotoPaths('patient-1', 'entry-1', {
        photoPath: 'patients/patient-2/entries/entry-1/photos/photo-1.jpg',
        thumbnailPath: 'patients/patient-1/entries/entry-1/thumbs/base64-photo-1.jpg',
      }),
    ).toEqual(['PHOTO_PATH_INVALID', 'PHOTO_PATH_BASE64_FORBIDDEN']);
  });
});

describe('prepared photo metadata', () => {
  it('accepts compressed JPEG metadata inside hard safety limits', () => {
    expect(
      validatePreparedPhotoMetadata({
        mimeType: PHOTO_MIME_TYPE,
        widthPx: 1280,
        heightPx: 960,
        sizeBytes: 320 * 1024,
        thumbnail: {
          widthPx: 320,
          heightPx: 240,
          sizeBytes: 32 * 1024,
        },
      }),
    ).toEqual({ valid: true, errors: [], warnings: [] });
  });

  it('rejects non-JPEG or full-width originals before upload', () => {
    expect(
      validatePreparedPhotoMetadata({
        mimeType: 'image/png' as typeof PHOTO_MIME_TYPE,
        widthPx: 1800,
        heightPx: 1200,
        sizeBytes: 800 * 1024,
        thumbnail: {
          widthPx: 320,
          heightPx: 240,
          sizeBytes: 90 * 1024,
        },
      }),
    ).toMatchObject({
      valid: false,
      errors: ['PHOTO_MIME_TYPE_INVALID', 'PHOTO_WIDTH_TOO_LARGE'],
      warnings: ['PHOTO_SIZE_OUTSIDE_TARGET', 'THUMBNAIL_SIZE_OUTSIDE_TARGET'],
    });
  });

  it('rejects implausibly tiny photo payload metadata', () => {
    expect(
      validatePreparedPhotoMetadata({
        mimeType: PHOTO_MIME_TYPE,
        widthPx: 1280,
        heightPx: 960,
        sizeBytes: 14,
        thumbnail: {
          widthPx: 320,
          heightPx: 240,
          sizeBytes: 14,
        },
      }),
    ).toMatchObject({
      valid: false,
      errors: ['PHOTO_SIZE_TOO_SMALL', 'THUMBNAIL_SIZE_TOO_SMALL'],
    });
  });
});

describe('createPhotoId', () => {
  it('returns unique RFC 4122 UUID v4 identifiers', () => {
    const ids = Array.from({ length: 20 }, () => createPhotoId());
    expect(new Set(ids)).toHaveLength(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    }
  });
});
