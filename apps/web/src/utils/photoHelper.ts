import {
  PHOTO_MAX_WIDTH_PX,
  PHOTO_JPEG_QUALITY,
  PHOTO_MIME_TYPE,
  type PreparedPhotoMetadata,
} from '@project4/photo';

export interface WebPreparedPhoto {
  originalFilename: string;
  photoBody: Blob;
  thumbnailBody: Blob;
  metadata: PreparedPhotoMetadata;
  previewUrl: string;
}

export async function prepareWebPhoto(file: File): Promise<WebPreparedPhoto> {
  // Load file into Image object
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
  });

  // Calculate main photo dimensions
  let width = image.width;
  let height = image.height;
  if (width > PHOTO_MAX_WIDTH_PX) {
    height = Math.round((height * PHOTO_MAX_WIDTH_PX) / width);
    width = PHOTO_MAX_WIDTH_PX;
  }

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
      PHOTO_JPEG_QUALITY
    );
  });

  // Calculate thumbnail dimensions (max width 320)
  let thumbWidth = width;
  let thumbHeight = height;
  if (thumbWidth > 320) {
    thumbHeight = Math.round((thumbHeight * 320) / thumbWidth);
    thumbWidth = 320;
  }

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
      0.72 // matching mobile quality
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

  // Clean up object URL
  URL.revokeObjectURL(image.src);

  return {
    originalFilename: file.name,
    photoBody: photoBlob,
    thumbnailBody: thumbBlob,
    metadata,
    previewUrl: URL.createObjectURL(photoBlob),
  };
}
