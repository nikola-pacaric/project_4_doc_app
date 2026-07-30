import {
  PHOTO_MAX_WIDTH_PX,
  PHOTO_JPEG_QUALITY,
  PHOTO_MIME_TYPE,
  PHOTO_THUMBNAIL_JPEG_QUALITY,
  PHOTO_THUMBNAIL_MAX_WIDTH_PX,
  constrainPhotoDimensions,
  createPhotoId,
  type PreparedPhotoMetadata,
} from '@project4/photo';

export interface WebPreparedPhoto {
  uploadId: string;
  originalFilename: string;
  photoBody: Blob;
  thumbnailBody: Blob;
  metadata: PreparedPhotoMetadata;
  previewUrl: string;
}

export async function prepareWebPhoto(file: File): Promise<WebPreparedPhoto> {
  const sourceUrl = URL.createObjectURL(file);
  let image: HTMLImageElement;
  try {
    image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.src = sourceUrl;
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }

  // Calculate main photo dimensions
  const { widthPx: width, heightPx: height } = constrainPhotoDimensions(
    image.width,
    image.height,
    PHOTO_MAX_WIDTH_PX,
  );

  // Draw main photo to canvas
  const mainCanvas = document.createElement('canvas');
  mainCanvas.width = width;
  mainCanvas.height = height;
  const mainCtx = mainCanvas.getContext('2d');
  if (!mainCtx) throw new Error('Canvas 2D context not available');
  mainCtx.drawImage(image, 0, 0, width, height);

  // Convert main photo to Blob
  const photoBlob = await new Promise<Blob>((resolve, reject) => {
    mainCanvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Main photo blob generation failed'));
      },
      PHOTO_MIME_TYPE,
      PHOTO_JPEG_QUALITY,
    );
  });

  // Calculate thumbnail dimensions (max width 320)
  const { widthPx: thumbWidth, heightPx: thumbHeight } = constrainPhotoDimensions(
    width,
    height,
    PHOTO_THUMBNAIL_MAX_WIDTH_PX,
  );

  // Draw thumbnail to canvas
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = thumbWidth;
  thumbCanvas.height = thumbHeight;
  const thumbCtx = thumbCanvas.getContext('2d');
  if (!thumbCtx) throw new Error('Canvas 2D context not available');
  thumbCtx.drawImage(image, 0, 0, thumbWidth, thumbHeight);

  // Convert thumbnail to Blob
  const thumbBlob = await new Promise<Blob>((resolve, reject) => {
    thumbCanvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Thumbnail blob generation failed'));
      },
      PHOTO_MIME_TYPE,
      PHOTO_THUMBNAIL_JPEG_QUALITY,
    );
  });

  // Create metadata object
  const metadata: PreparedPhotoMetadata = {
    originalFilename: file.name,
    mimeType: PHOTO_MIME_TYPE,
    widthPx: width,
    heightPx: height,
    sizeBytes: photoBlob.size,
    thumbnail: {
      widthPx: thumbWidth,
      heightPx: thumbHeight,
      sizeBytes: thumbBlob.size,
    },
  };


  return {
    uploadId: createPhotoId(),
    originalFilename: file.name,
    photoBody: photoBlob,
    thumbnailBody: thumbBlob,
    metadata,
    previewUrl: URL.createObjectURL(photoBlob),
  };
}
