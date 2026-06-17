export const PHOTO_MAX_WIDTH_PX = 1280;
export const PHOTO_JPEG_QUALITY = 0.8;

export interface PhotoStoragePaths {
  photoPath: string;
  thumbnailPath: string;
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
