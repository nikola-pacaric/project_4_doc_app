export const PHOTO_MAX_WIDTH_PX = 1280;
export const PHOTO_JPEG_QUALITY = 0.8;
export const PHOTO_THUMBNAIL_MAX_WIDTH_PX = 320;
export const PHOTO_THUMBNAIL_JPEG_QUALITY = 0.72;
export const PHOTO_BUCKET = 'patient-entry-photos';
export const PHOTO_MIME_TYPE = 'image/jpeg';
export const PHOTO_TARGET_MIN_BYTES = 250 * 1024;
export const PHOTO_TARGET_MAX_BYTES = 500 * 1024;
export const PHOTO_THUMBNAIL_TARGET_MIN_BYTES = 20 * 1024;
export const PHOTO_THUMBNAIL_TARGET_MAX_BYTES = 60 * 1024;
export const PHOTO_MIN_VALID_BYTES = 1024;
export const PHOTO_THUMBNAIL_MIN_VALID_BYTES = 1024;

interface DraftWithEntryPhotos<Photo> {
  entryId?: string | null;
  existingPhotos?: Photo[];
}

/**
 * Apply asynchronously loaded photos without replacing medical fields that may
 * have been edited while the optional photo request was still in flight.
 */
export function mergeExistingPhotosByEntryId<Photo, Draft extends DraftWithEntryPhotos<Photo>>(
  currentDrafts: Draft[],
  photoDrafts: Draft[],
): Draft[] {
  const photosByEntryId = new Map(
    photoDrafts.flatMap((draft) =>
      draft.entryId ? [[draft.entryId, draft.existingPhotos ?? []] as const] : [],
    ),
  );

  return currentDrafts.map((draft) => {
    if (!draft.entryId || !photosByEntryId.has(draft.entryId)) return draft;
    return { ...draft, existingPhotos: photosByEntryId.get(draft.entryId) };
  });
}

/** Create an RFC 4122 UUID v4 for the UUID-backed entry_photos.id column. */
export function createPhotoId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export interface PhotoStoragePaths {
  photoPath: string;
  thumbnailPath: string;
}

export interface PreparedPhotoDimensions {
  widthPx: number;
  heightPx: number;
  sizeBytes: number;
}

export interface PhotoPixelDimensions {
  widthPx: number;
  heightPx: number;
}

export interface PreparedPhotoMetadata extends PreparedPhotoDimensions {
  originalFilename?: string;
  mimeType: typeof PHOTO_MIME_TYPE;
  thumbnail: PreparedPhotoDimensions;
}

export interface PhotoValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function constrainPhotoWidth(widthPx: number, maxWidthPx: number): number {
  if (
    !Number.isFinite(widthPx) ||
    !Number.isFinite(maxWidthPx) ||
    widthPx <= 0 ||
    maxWidthPx <= 0
  ) {
    throw new Error('Photo dimensions must be positive finite numbers.');
  }

  return Math.min(widthPx, maxWidthPx);
}

export function constrainPhotoDimensions(
  widthPx: number,
  heightPx: number,
  maxWidthPx: number,
): PhotoPixelDimensions {
  if (!Number.isFinite(heightPx) || heightPx <= 0) {
    throw new Error('Photo dimensions must be positive finite numbers.');
  }

  const constrainedWidthPx = constrainPhotoWidth(widthPx, maxWidthPx);
  if (constrainedWidthPx === widthPx) return { widthPx, heightPx };

  return {
    widthPx: constrainedWidthPx,
    heightPx: Math.round((heightPx * constrainedWidthPx) / widthPx),
  };
}
export function buildEntryPhotoPaths(
  patientId: string,
  entryId: string,
  photoId: string,
): PhotoStoragePaths {
  const basePath = `patients/${patientId}/entries/${entryId}`;

  return {
    photoPath: `${basePath}/photos/${photoId}.jpg`,
    thumbnailPath: `${basePath}/thumbs/${photoId}.jpg`,
  };
}

export function expectedEntryPhotoPrefix(patientId: string, entryId: string): string {
  return `patients/${patientId}/entries/${entryId}`;
}

export function validateEntryPhotoPaths(
  patientId: string,
  entryId: string,
  paths: PhotoStoragePaths,
): string[] {
  const prefix = expectedEntryPhotoPrefix(patientId, entryId);
  const errors: string[] = [];

  if (!paths.photoPath.startsWith(`${prefix}/photos/`) || !paths.photoPath.endsWith('.jpg')) {
    errors.push('PHOTO_PATH_INVALID');
  }
  if (
    !paths.thumbnailPath.startsWith(`${prefix}/thumbs/`) ||
    !paths.thumbnailPath.endsWith('.jpg')
  ) {
    errors.push('THUMBNAIL_PATH_INVALID');
  }
  if (paths.photoPath.includes('base64') || paths.thumbnailPath.includes('base64')) {
    errors.push('PHOTO_PATH_BASE64_FORBIDDEN');
  }
  if (paths.photoPath === paths.thumbnailPath) {
    errors.push('PHOTO_PATHS_MUST_DIFFER');
  }

  return errors;
}

export function validatePreparedPhotoMetadata(
  metadata: PreparedPhotoMetadata,
): PhotoValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (metadata.mimeType !== PHOTO_MIME_TYPE) {
    errors.push('PHOTO_MIME_TYPE_INVALID');
  }
  if (!Number.isInteger(metadata.widthPx) || metadata.widthPx < 1) {
    errors.push('PHOTO_WIDTH_INVALID');
  }
  if (metadata.widthPx > PHOTO_MAX_WIDTH_PX) {
    errors.push('PHOTO_WIDTH_TOO_LARGE');
  }
  if (!Number.isInteger(metadata.heightPx) || metadata.heightPx < 1) {
    errors.push('PHOTO_HEIGHT_INVALID');
  }
  if (!Number.isInteger(metadata.sizeBytes) || metadata.sizeBytes < 1) {
    errors.push('PHOTO_SIZE_INVALID');
  } else if (metadata.sizeBytes < PHOTO_MIN_VALID_BYTES) {
    errors.push('PHOTO_SIZE_TOO_SMALL');
  }
  if (!Number.isInteger(metadata.thumbnail.sizeBytes) || metadata.thumbnail.sizeBytes < 1) {
    errors.push('THUMBNAIL_SIZE_INVALID');
  } else if (metadata.thumbnail.sizeBytes < PHOTO_THUMBNAIL_MIN_VALID_BYTES) {
    errors.push('THUMBNAIL_SIZE_TOO_SMALL');
  }
  if (metadata.sizeBytes > PHOTO_TARGET_MAX_BYTES || metadata.sizeBytes < PHOTO_TARGET_MIN_BYTES) {
    warnings.push('PHOTO_SIZE_OUTSIDE_TARGET');
  }
  if (
    metadata.thumbnail.sizeBytes > PHOTO_THUMBNAIL_TARGET_MAX_BYTES ||
    metadata.thumbnail.sizeBytes < PHOTO_THUMBNAIL_TARGET_MIN_BYTES
  ) {
    warnings.push('THUMBNAIL_SIZE_OUTSIDE_TARGET');
  }

  return { valid: errors.length === 0, errors, warnings };
}
