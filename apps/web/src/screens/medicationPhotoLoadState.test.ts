import { describe, expect, it } from 'vitest';

import { mergeMedicationExistingPhotos } from './medicationPhotoLoadState';

describe('mergeMedicationExistingPhotos', () => {
  it('preserves user fields and a prepared local photo while replacing saved photos', () => {
    const localPhoto = { uploadId: 'local-photo-1' };
    const draft = {
      dose: '20 mg',
      existingPhotos: [{ id: 'old-photo' }],
      localPhoto,
      name: 'Edited medicine',
    };
    const existingPhotos = [{ id: 'loaded-photo' }];

    expect(mergeMedicationExistingPhotos(draft, existingPhotos)).toEqual({
      dose: '20 mg',
      existingPhotos,
      localPhoto,
      name: 'Edited medicine',
    });
  });
});
