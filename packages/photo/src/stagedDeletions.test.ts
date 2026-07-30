import { describe, expect, it } from 'vitest';

import {
  createStagedEntryPhotoDeletions,
  filterStagedEntryPhotos,
  stageEntryPhotoDeletions,
  stageRemovedDraftEntryPhotos,
} from './stagedDeletions';

const photo1 = {
  id: 'photo-1',
  photoPath: 'patient/meal/photos/1.jpg',
  thumbnailPath: 'patient/meal/thumbs/1.jpg',
};
const photo2 = {
  id: 'photo-2',
  photoPath: 'patient/meal/photos/2.jpg',
  thumbnailPath: 'patient/meal/thumbs/2.jpg',
};

describe('staged entry photo deletions', () => {
  it('deduplicates staged photos and filters them from late loads', () => {
    const stagedOnce = stageEntryPhotoDeletions(createStagedEntryPhotoDeletions(), [photo1]);
    const stagedTwice = stageEntryPhotoDeletions(stagedOnce, [photo1]);

    expect(stagedTwice.photos).toEqual([photo1]);
    expect(filterStagedEntryPhotos([photo1, photo2], stagedTwice)).toEqual([photo2]);
  });

  it('captures removed entry ids even when photo enrichment was unavailable', () => {
    const staged = stageRemovedDraftEntryPhotos(
      createStagedEntryPhotoDeletions(),
      [
        { entryId: 'meal-1', existingPhotos: [photo1] },
        { entryId: 'meal-2', existingPhotos: [photo2] },
        { entryId: 'meal-unloaded' },
      ],
      [{ entryId: 'meal-2', existingPhotos: [photo2] }],
    );

    expect(staged.entryIds).toEqual(['meal-1', 'meal-unloaded']);
    expect(staged.photos).toEqual([photo1]);
  });

  it('does not stage persisted rows retained by an edited clone', () => {
    const current = [{ entryId: 'meal-1', existingPhotos: [photo1] }];
    const next = [{ entryId: 'meal-1', existingPhotos: [photo1], name: 'Edited meal' }];

    expect(stageRemovedDraftEntryPhotos(createStagedEntryPhotoDeletions(), current, next)).toEqual(
      createStagedEntryPhotoDeletions(),
    );
  });
});
