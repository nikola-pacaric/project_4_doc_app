import { describe, expect, it } from 'vitest';

import { fluidPhotoContextLabel } from './photoContextLabel';

describe('fluidPhotoContextLabel', () => {
  it('preserves a trimmed fluid name as the stored photo context label', () => {
    expect(fluidPhotoContextLabel('sr', '  Caj  ')).toBe('Caj');
  });

  it('uses the localized fallback when the fluid name is blank', () => {
    expect(fluidPhotoContextLabel('en', '  ')).toBe('Fluid photo');
    expect(fluidPhotoContextLabel('sr', '')).toBe('Fotografija tecnosti');
  });
});
