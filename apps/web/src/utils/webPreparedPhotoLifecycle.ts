import type { WebPreparedPhoto } from './photoHelper';

const releasedPreparedPhotos = new WeakSet<WebPreparedPhoto>();

export function releaseWebPreparedPhoto(photo: WebPreparedPhoto | null | undefined): void {
  if (!photo || releasedPreparedPhotos.has(photo)) return;
  releasedPreparedPhotos.add(photo);
  URL.revokeObjectURL(photo.previewUrl);
}

export function deferWebPreparedPhotoRelease(
  photo: WebPreparedPhoto | null | undefined,
  shouldRetain: () => boolean,
): void {
  if (!photo) return;
  queueMicrotask(() => {
    if (!shouldRetain()) releaseWebPreparedPhoto(photo);
  });
}
