import {
  PHOTO_BUCKET,
  PHOTO_MIME_TYPE,
  buildEntryPhotoPaths,
  validateEntryPhotoPaths,
  validatePreparedPhotoMetadata,
  type PreparedPhotoMetadata,
} from '@project4/photo';

import type { AppSupabaseClient } from './index';

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

export interface EntryPhotoRow {
  id: string;
  entry_id: string;
  patient_id: string;
  photo_path: string;
  thumbnail_path: string;
  original_filename: string | null;
  mime_type: typeof PHOTO_MIME_TYPE;
  width_px: number | null;
  height_px: number | null;
  size_bytes: number | null;
  thumbnail_size_bytes: number | null;
  context_type: string | null;
  context_label: string | null;
  created_at: string;
}

export type PhotoUploadBody = Blob | ArrayBuffer | Uint8Array;

export interface UploadPreparedEntryPhotoInput {
  entryId: string;
  patientId: string;
  photoId: string;
  photoBody: PhotoUploadBody;
  thumbnailBody: PhotoUploadBody;
  metadata: PreparedPhotoMetadata;
  contextType?: 'meal' | 'fluid' | 'medication';
  contextLabel?: string;
}

const entryPhotoColumns =
  'id, entry_id, patient_id, photo_path, thumbnail_path, original_filename, mime_type, width_px, height_px, size_bytes, thumbnail_size_bytes, context_type, context_label, created_at';

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

  if (pathErrors.length || !metadataValidation.valid) {
    throw new Error([...pathErrors, ...metadataValidation.errors].join(','));
  }

  const bucket = client.storage.from(PHOTO_BUCKET);
  const uploadOptions = { contentType: PHOTO_MIME_TYPE, upsert: false };
  const uploadedPaths: string[] = [];

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

    const { data, error } = await client
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
        context_type: input.contextType ?? null,
        context_label: input.contextLabel?.trim() || null,
      })
      .select(entryPhotoColumns)
      .single<EntryPhotoRow>();

    if (error) throw error;
    return toEntryPhoto(data);
  } catch (error) {
    if (uploadedPaths.length) {
      await bucket.remove(uploadedPaths);
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
