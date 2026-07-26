import { describe, expect, it } from 'vitest';

import {
  PHOTO_JPEG_QUALITY,
  PHOTO_MAX_WIDTH_PX,
  PHOTO_MIME_TYPE,
  PHOTO_THUMBNAIL_JPEG_QUALITY,
  PHOTO_THUMBNAIL_MAX_WIDTH_PX,
  buildEntryPhotoPaths,
  constrainPhotoDimensions,
  constrainPhotoWidth,
  createPhotoId,
  mergeExistingPhotosByEntryId,
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

describe('shared photo preprocessing constraints', () => {
  it('exposes the same main and thumbnail limits for browser and mobile consumers', () => {
    expect({
      main: { maxWidthPx: PHOTO_MAX_WIDTH_PX, jpegQuality: PHOTO_JPEG_QUALITY },
      thumbnail: {
        maxWidthPx: PHOTO_THUMBNAIL_MAX_WIDTH_PX,
        jpegQuality: PHOTO_THUMBNAIL_JPEG_QUALITY,
      },
    }).toEqual({
      main: { maxWidthPx: 1280, jpegQuality: 0.8 },
      thumbnail: { maxWidthPx: 320, jpegQuality: 0.72 },
    });
  });

  it('preserves aspect ratio without upscaling either output', () => {
    expect(constrainPhotoWidth(4032, PHOTO_MAX_WIDTH_PX)).toBe(1280);
    expect(constrainPhotoWidth(240, PHOTO_THUMBNAIL_MAX_WIDTH_PX)).toBe(240);
    expect(constrainPhotoDimensions(4032, 3024, PHOTO_MAX_WIDTH_PX)).toEqual({
      widthPx: 1280,
      heightPx: 960,
    });
    expect(constrainPhotoDimensions(1280, 960, PHOTO_THUMBNAIL_MAX_WIDTH_PX)).toEqual({
      widthPx: 320,
      heightPx: 240,
    });
    expect(constrainPhotoDimensions(240, 320, PHOTO_THUMBNAIL_MAX_WIDTH_PX)).toEqual({
      widthPx: 240,
      heightPx: 320,
    });
  });

  it('rejects invalid source dimensions', () => {
    expect(() => constrainPhotoDimensions(0, 960, PHOTO_MAX_WIDTH_PX)).toThrow(
      'Photo dimensions must be positive finite numbers.',
    );
  });
});

describe('optional photo enrichment', () => {
  it('merges photo fields without overwriting medical edits made while photos load', () => {
    const current = [
      { entryId: 'meal-1', name: 'Edited meal', existingPhotos: undefined as string[] | undefined },
      { entryId: 'meal-2', name: 'Removed photo', existingPhotos: ['old-photo'] },
      { name: 'New unsaved meal', existingPhotos: undefined as string[] | undefined },
    ];

    expect(
      mergeExistingPhotosByEntryId(current, [
        { entryId: 'meal-1', name: 'Stale server name', existingPhotos: ['photo-1'] },
        { entryId: 'meal-2', name: 'Stale server name', existingPhotos: [] },
      ]),
    ).toEqual([
      { entryId: 'meal-1', name: 'Edited meal', existingPhotos: ['photo-1'] },
      { entryId: 'meal-2', name: 'Removed photo', existingPhotos: [] },
      { name: 'New unsaved meal', existingPhotos: undefined },
    ]);
  });

  it('does not re-add a medical draft removed before optional photos finish loading', () => {
    expect(
      mergeExistingPhotosByEntryId(
        [{ entryId: 'meal-2', name: 'Still present' }],
        [
          { entryId: 'meal-1', name: 'Removed', existingPhotos: ['photo-1'] },
          { entryId: 'meal-2', name: 'Still present', existingPhotos: ['photo-2'] },
        ],
      ),
    ).toEqual([{ entryId: 'meal-2', name: 'Still present', existingPhotos: ['photo-2'] }]);
  });
});
