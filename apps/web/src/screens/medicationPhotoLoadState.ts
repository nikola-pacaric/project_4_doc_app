export function mergeMedicationExistingPhotos<
  TDraft extends object,
  TPhoto,
>(
  draft: TDraft,
  existingPhotos: TPhoto[],
): TDraft & { existingPhotos: TPhoto[] } {
  return {
    ...draft,
    existingPhotos,
  };
}
