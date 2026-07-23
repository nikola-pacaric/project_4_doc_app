import {
  createEntryPhotoSignedUrl,
  type AppSupabaseClient,
  type EntryPhoto,
} from '@project4/supabase-client';

export type PersistedEntryPhoto = Pick<EntryPhoto, 'id' | 'photoPath' | 'thumbnailPath'> & {
  uri: string;
};

export async function withSignedThumbnailUris(
  client: AppSupabaseClient,
  photos: EntryPhoto[],
): Promise<PersistedEntryPhoto[]> {
  return Promise.all(
    photos.map(async (photo) => ({
      id: photo.id,
      photoPath: photo.photoPath,
      thumbnailPath: photo.thumbnailPath,
      uri: await createEntryPhotoSignedUrl(client, photo.thumbnailPath),
    })),
  );
}
