import {
  PHOTO_BUCKET,
  PHOTO_MIME_TYPE,
  buildEntryPhotoPaths,
  validateEntryPhotoPaths,
  validatePreparedPhotoMetadata,
  type PreparedPhotoMetadata,
} from '@project4/photo';

import type { AppSupabaseClient } from './index';
import type { Database } from './database.types';

export interface EntryPhoto {
  id: string;
  entryId: string;
  patientId: string;
  photoPath: string;
  thumbnailPath: string;
  originalFilename: string | null;
  mimeType: typeof PHOTO_MIME_TYPE;
  widthPx: number | null;
  heightPx: number | null;
  sizeBytes: number | null;
  thumbnailSizeBytes: number | null;
  contextType: string | null;
  contextLabel: string | null;
  createdAt: string;
}

export type EntryPhotoRow = Pick<
  Database['public']['Tables']['entry_photos']['Row'],
  | 'id'
  | 'entry_id'
  | 'patient_id'
  | 'photo_path'
  | 'thumbnail_path'
  | 'original_filename'
  | 'mime_type'
  | 'width_px'
  | 'height_px'
  | 'size_bytes'
  | 'thumbnail_size_bytes'
  | 'context_type'
  | 'context_label'
  | 'created_at'
> & { mime_type: typeof PHOTO_MIME_TYPE };

export type PhotoUploadBody = Blob | ArrayBuffer | Uint8Array;

export interface UploadPreparedEntryPhotoInput {
  entryId: string;
  patientId: string;
  photoId: string;
  photoBody: PhotoUploadBody;
  thumbnailBody: PhotoUploadBody;
  metadata: PreparedPhotoMetadata;
  contextType: 'meal' | 'fluid' | 'medication';
  contextLabel?: string;
}

const entryPhotoColumns =
  'id, entry_id, patient_id, photo_path, thumbnail_path, original_filename, mime_type, width_px, height_px, size_bytes, thumbnail_size_bytes, context_type, context_label, created_at';

function bodyByteLength(body: PhotoUploadBody): number {
  if (body instanceof Uint8Array) return body.byteLength;
  if (body instanceof ArrayBuffer) return body.byteLength;
  return body.size;
}

async function bodyStartsWithJpegSignature(body: PhotoUploadBody): Promise<boolean> {
  const head =
    body instanceof Uint8Array
      ? body.subarray(0, 3)
      : body instanceof ArrayBuffer
        ? new Uint8Array(body, 0, Math.min(3, body.byteLength))
        : new Uint8Array(await body.slice(0, 3).arrayBuffer());

  return head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
}

async function validateUploadBodies(input: UploadPreparedEntryPhotoInput): Promise<string[]> {
  const errors: string[] = [];
  const photoBodyBytes = bodyByteLength(input.photoBody);
  const thumbnailBodyBytes = bodyByteLength(input.thumbnailBody);

  if (photoBodyBytes !== input.metadata.sizeBytes) {
    errors.push('PHOTO_BODY_SIZE_MISMATCH');
  }
  if (thumbnailBodyBytes !== input.metadata.thumbnail.sizeBytes) {
    errors.push('THUMBNAIL_BODY_SIZE_MISMATCH');
  }
  if (!(await bodyStartsWithJpegSignature(input.photoBody))) {
    errors.push('PHOTO_BODY_NOT_JPEG');
  }
  if (!(await bodyStartsWithJpegSignature(input.thumbnailBody))) {
    errors.push('THUMBNAIL_BODY_NOT_JPEG');
  }

  return errors;
}

export function toEntryPhoto(row: EntryPhotoRow): EntryPhoto {
  return {
    id: row.id,
    entryId: row.entry_id,
    patientId: row.patient_id,
    photoPath: row.photo_path,
    thumbnailPath: row.thumbnail_path,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    widthPx: row.width_px,
    heightPx: row.height_px,
    sizeBytes: row.size_bytes,
    thumbnailSizeBytes: row.thumbnail_size_bytes,
    contextType: row.context_type,
    contextLabel: row.context_label,
    createdAt: row.created_at,
  };
}

export async function listEntryPhotos(
  client: AppSupabaseClient,
  entryId: string,
): Promise<EntryPhoto[]> {
  const { data, error } = await client
    .from('entry_photos')
    .select(entryPhotoColumns)
    .eq('entry_id', entryId)
    .order('created_at', { ascending: false })
    .returns<EntryPhotoRow[]>();

  if (error) throw error;
  return data.map(toEntryPhoto);
}

export async function createEntryPhotoSignedUrl(
  client: AppSupabaseClient,
  path: string,
  expiresInSeconds = 300,
): Promise<string> {
  const { data, error } = await client.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) throw error;
  return data.signedUrl;
}

export async function uploadPreparedEntryPhoto(
  client: AppSupabaseClient,
  input: UploadPreparedEntryPhotoInput,
): Promise<EntryPhoto> {
  const paths = buildEntryPhotoPaths(input.patientId, input.entryId, input.photoId);
  const pathErrors = validateEntryPhotoPaths(input.patientId, input.entryId, paths);
  const metadataValidation = validatePreparedPhotoMetadata(input.metadata);
  const bodyErrors = await validateUploadBodies(input);

  if (pathErrors.length || !metadataValidation.valid || bodyErrors.length) {
    throw new Error([...pathErrors, ...metadataValidation.errors, ...bodyErrors].join(','));
  }

  const bucket = client.storage.from(PHOTO_BUCKET);
  const uploadOptions = { contentType: PHOTO_MIME_TYPE, upsert: false };
  const uploadedPaths: string[] = [];

  const { data: createdRow, error: metadataError } = await client
    .from('entry_photos')
    .insert({
      entry_id: input.entryId,
      patient_id: input.patientId,
      photo_path: paths.photoPath,
      thumbnail_path: paths.thumbnailPath,
      original_filename: input.metadata.originalFilename ?? null,
      mime_type: PHOTO_MIME_TYPE,
      width_px: input.metadata.widthPx,
      height_px: input.metadata.heightPx,
      size_bytes: input.metadata.sizeBytes,
      thumbnail_size_bytes: input.metadata.thumbnail.sizeBytes,
      context_type: input.contextType,
      context_label: input.contextLabel?.trim() || null,
    })
    .select(entryPhotoColumns)
    .single<EntryPhotoRow>();

  if (metadataError) throw metadataError;
  const createdPhoto = toEntryPhoto(createdRow);

  try {
    const photoUpload = await bucket.upload(paths.photoPath, input.photoBody, uploadOptions);
    if (photoUpload.error) throw photoUpload.error;
    uploadedPaths.push(paths.photoPath);

    const thumbnailUpload = await bucket.upload(
      paths.thumbnailPath,
      input.thumbnailBody,
      uploadOptions,
    );
    if (thumbnailUpload.error) throw thumbnailUpload.error;
    uploadedPaths.push(paths.thumbnailPath);

    return createdPhoto;
  } catch (error) {
    let objectsRemoved = true;
    if (uploadedPaths.length) {
      const cleanup = await bucket.remove(uploadedPaths);
      objectsRemoved = !cleanup.error;
    }
    if (objectsRemoved) {
      await client.from('entry_photos').delete().eq('id', createdPhoto.id);
    }
    throw error;
  }
}

export async function deleteEntryPhotos(
  client: AppSupabaseClient,
  photos: Pick<EntryPhoto, 'id' | 'photoPath' | 'thumbnailPath'>[],
): Promise<void> {
  if (!photos.length) return;

  const paths = photos.flatMap((photo) => [photo.photoPath, photo.thumbnailPath]);
  const bucket = client.storage.from(PHOTO_BUCKET);
  const storageDelete = await bucket.remove(paths);
  if (storageDelete.error) throw storageDelete.error;

  const { error } = await client
    .from('entry_photos')
    .delete()
    .in(
      'id',
      photos.map((photo) => photo.id),
    );
  if (error) throw error;
}

export async function deleteEntryPhotoObjects(
  client: AppSupabaseClient,
  photos: Pick<EntryPhoto, 'photoPath' | 'thumbnailPath'>[],
): Promise<void> {
  if (!photos.length) return;

  const paths = photos.flatMap((photo) => [photo.photoPath, photo.thumbnailPath]);
  const { error } = await client.storage.from(PHOTO_BUCKET).remove(paths);
  if (error) throw error;
}

/**
 * Replays persisted cleanup work. Current queue items include the photo row id,
 * while legacy items only have object paths and must remain recoverable.
 */
export async function deleteQueuedEntryPhotos(
  client: AppSupabaseClient,
  photos: { id?: string; photoPath: string; thumbnailPath: string }[],
): Promise<void> {
  const photosWithRows = photos.filter(
    (photo): photo is { id: string; photoPath: string; thumbnailPath: string } =>
      typeof photo.id === 'string' && photo.id.length > 0,
  );
  const legacyObjects = photos.filter((photo) => !photo.id);

  await deleteEntryPhotos(client, photosWithRows);
  await deleteEntryPhotoObjects(client, legacyObjects);
}
