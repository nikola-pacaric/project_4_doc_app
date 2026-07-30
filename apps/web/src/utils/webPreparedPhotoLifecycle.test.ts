import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WebPreparedPhoto } from './photoHelper';
import {
  deferWebPreparedPhotoRelease,
  releaseWebPreparedPhoto,
} from './webPreparedPhotoLifecycle';

function preparedPhoto(id: string): WebPreparedPhoto {
  return {
    uploadId: id,
    originalFilename: `${id}.png`,
    photoBody: new Blob(['photo']),
    thumbnailBody: new Blob(['thumb']),
    metadata: {
      originalFilename: `${id}.png`,
      mimeType: 'image/jpeg',
      widthPx: 1280,
      heightPx: 720,
      sizeBytes: 5,
      thumbnail: { widthPx: 320, heightPx: 180, sizeBytes: 5 },
    },
    previewUrl: `blob:${id}`,
  };
}

async function flushMicrotasks() {
  await new Promise<void>((resolve) => queueMicrotask(resolve));
}

describe('web prepared photo preview lifecycle', () => {
  afterEach(() => vi.restoreAllMocks());

  it('retains the current preview across StrictMode setup-cleanup-setup', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const photo = preparedPhoto('strict');
    let mounted = true;
    let current: WebPreparedPhoto | null = photo;

    deferWebPreparedPhotoRelease(photo, () => mounted && current === photo);
    mounted = false;
    mounted = true;
    current = photo;
    await flushMicrotasks();

    expect(revoke).not.toHaveBeenCalled();
  });

  it('releases the previous preview after replacement', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const previous = preparedPhoto('previous');
    const replacement = preparedPhoto('replacement');
    let current: WebPreparedPhoto | null = previous;

    deferWebPreparedPhotoRelease(previous, () => current === previous);
    current = replacement;
    await flushMicrotasks();

    expect(revoke).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith(previous.previewUrl);
  });

  it('releases the preview after removal', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const photo = preparedPhoto('removed');
    let current: WebPreparedPhoto | null = photo;

    deferWebPreparedPhotoRelease(photo, () => current === photo);
    current = null;
    await flushMicrotasks();

    expect(revoke).toHaveBeenCalledWith(photo.previewUrl);
  });

  it('releases after actual unmount and remains idempotent', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const photo = preparedPhoto('unmounted');
    let mounted = true;

    deferWebPreparedPhotoRelease(photo, () => mounted);
    mounted = false;
    await flushMicrotasks();
    releaseWebPreparedPhoto(photo);

    expect(revoke).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith(photo.previewUrl);
  });
});
