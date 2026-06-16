# Quickstart Validation Guide: Medical Tracking Research MVP

This guide defines end-to-end validation scenarios for programmers once an implementation exists. It does not create application code.

## Prerequisites

- One patient test account.
- One doctor test account.
- One unrelated doctor account.
- Supabase project with Auth, Postgres, private Storage bucket, and RLS enabled.
- Android phone, Huawei Android phone, and Chromium-based browser test targets.
- Network toggle or devtools method for offline/online testing.
- Large sample image for compression testing.

## Scenario 1: Roles and Consent

1. Sign up or log in as patient.
2. Verify consent screen appears before normal app use.
3. Accept consent.
4. Verify patient timeline opens.
5. Repeat for doctor account and verify doctor dashboard opens.
6. Attempt to access the other role's screen.

Expected:

- Consent acceptance is stored.
- One account has exactly one role.
- Cross-role access is blocked.

## Scenario 2: Invite-Code Linking

1. Doctor creates an invite code.
2. Patient opens Link Doctor and enters the code.
3. Doctor dashboard refreshes.
4. Try redeeming the same code again.
5. Unrelated doctor attempts to view the patient.

Expected:

- Active `doctor_patient_access` row exists for doctor and patient.
- Code is marked used and cannot be reused.
- Unrelated doctor cannot view patient data.

## Scenario 3: Patient Entries Online and Offline-Lite

1. Patient creates an online Meal entry with a custom field.
2. Confirm it appears on the timeline.
3. Disable connectivity.
4. Open a previously cached day.
5. Create a Symptom text entry offline.
6. Edit timestamp while pending.
7. Restore connectivity.

Expected:

- Offline entry shows Pending sync.
- Entry syncs once when online.
- Edited timestamp persists.
- No duplicate row is created.

## Scenario 4: Photo Upload

1. Patient selects or takes a large photo while online.
2. Confirm preview appears.
3. Upload photo to a current entry.
4. Attach another photo later to an older entry.
5. Attempt photo upload while offline.

Expected:

- Main image is resized/compressed to JPEG max width 1280px.
- Thumbnail is generated.
- Private storage contains compressed image and thumbnail only.
- Database stores paths/metadata only, no base64 and no original.
- Offline upload is blocked with clear messaging.

## Scenario 5: Local Hide/Delete Retention

1. Patient hides an entry.
2. Verify default patient timeline omits it.
3. Inspect database.
4. Patient locally deletes a photo or entry.
5. Inspect database again.
6. Doctor exports data for the relevant range.

Expected:

- Underlying research rows and storage objects remain.
- `user_content_visibility_states` records hidden/locally deleted state.
- Export includes retained content with visibility/deletion metadata.

## Scenario 6: Doctor Dashboard and Exports

1. Doctor opens linked patient timeline.
2. Export selected day in All Data mode.
3. Export current partial month in All Data With Images mode.
4. Export Images Only With Labels.
5. Attempt export for an unlinked patient.

Expected:

- Day range is selected date 00:00 to next day 00:00.
- Current month range ends at current date/time.
- Signed URLs are included only for image modes.
- Images-only mode excludes long notes and symptom descriptions.
- Unlinked export is denied.

## Scenario 7: Voice, Language, and Theme

1. Switch UI language to Serbian.
2. Switch UI language to English.
3. Set voice language to Serbian `sr-RS` and test a text field where supported.
4. Set voice language to English `en-US` and test a text field where supported.
5. Disable or use unsupported voice recognition.
6. Switch light/dark theme.

Expected:

- Visible UI strings come from translation files.
- Voice transcript appends to existing text and is editable before save.
- Typing fallback works.
- Theme changes do not break readability.

## Scenario 8: RLS and Storage Privacy

1. Run policy tests for patient, linked doctor, unrelated doctor, and unauthenticated contexts.
2. Try to read unrelated patient entries, photo metadata, storage objects, invite codes, and exports.

Expected:

- Patient sees only own allowed data.
- Linked doctor sees only active linked patients.
- Unrelated doctor and unauthenticated contexts are denied.
- Storage access requires valid owner/link relationship and signed URL rules.
