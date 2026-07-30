export interface EntryPhotoDeletionTarget {
  id: string;
  photoPath: string;
  thumbnailPath: string;
}

interface DraftWithPersistedEntryPhotos<Photo extends EntryPhotoDeletionTarget> {
  entryId?: string | null;
  existingPhotos?: readonly Photo[];
}

export interface StagedEntryPhotoDeletions {
  entryIds: string[];
  photos: EntryPhotoDeletionTarget[];
}

export function createStagedEntryPhotoDeletions(): StagedEntryPhotoDeletions {
  return { entryIds: [], photos: [] };
}

export function stageEntryPhotoDeletions(
  current: StagedEntryPhotoDeletions,
  photos: readonly EntryPhotoDeletionTarget[],
): StagedEntryPhotoDeletions {
  return {
    ...current,
    photos: [...new Map([...current.photos, ...photos].map((photo) => [photo.id, photo])).values()],
  };
}

export function stageRemovedDraftEntryPhotos<Photo extends EntryPhotoDeletionTarget>(
  current: StagedEntryPhotoDeletions,
  currentDrafts: readonly DraftWithPersistedEntryPhotos<Photo>[],
  nextDrafts: readonly DraftWithPersistedEntryPhotos<Photo>[],
): StagedEntryPhotoDeletions {
  const retainedPhotoIds = new Set(
    nextDrafts.flatMap((draft) => (draft.existingPhotos ?? []).map((photo) => photo.id)),
  );
  const retainedEntryIds = new Set(
    nextDrafts.flatMap((draft) => (draft.entryId ? [draft.entryId] : [])),
  );
  const removedPhotos = currentDrafts.flatMap((draft) =>
    (draft.existingPhotos ?? []).filter((photo) => !retainedPhotoIds.has(photo.id)),
  );
  const staged = stageEntryPhotoDeletions(current, removedPhotos);

  return {
    entryIds: [
      ...new Set([
        ...staged.entryIds,
        ...currentDrafts.flatMap((draft) =>
          draft.entryId && !retainedEntryIds.has(draft.entryId) ? [draft.entryId] : [],
        ),
      ]),
    ],
    photos: staged.photos,
  };
}

export function filterStagedEntryPhotos<Photo extends EntryPhotoDeletionTarget>(
  photos: readonly Photo[],
  staged: StagedEntryPhotoDeletions,
): Photo[] {
  const stagedIds = new Set(staged.photos.map((photo) => photo.id));
  return photos.filter((photo) => !stagedIds.has(photo.id));
}
