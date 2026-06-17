# Quickstart Validation Guide: V1 Patient Research Tracking App

## Purpose

Use this guide after implementation to verify that V1 satisfies the specification
before release. It is not an implementation script.

## Prerequisites

- One Supabase project or local Supabase environment with migrations, policies,
  functions, and private storage configured.
- One manually created doctor account.
- One patient account.
- One account with empty/bad data for resilience testing.
- Web app build available.
- Android APK build available.
- Huawei Android device available if possible.
- Test photos larger than 1280px wide.
- Test data covering at least one meal, symptom, stool entry, medication entry,
  exercise entry, daily note, photo, and custom field.

## Validation Scenarios

### 1. First Working Slice

1. Open the web app.
2. Create/login with a patient account.
3. Accept consent if not already accepted.
4. Open the patient daily timeline.
5. Add a text daily note.
6. Edit the timestamp.
7. Save the entry.
8. Reload the app.

Expected outcome: the entry persists, appears on the correct day sorted by
timestamp, and belongs only to the current patient.

### 2. Full Baseline and Daily Forms

1. Complete baseline profile fields.
2. Enter major weight-change data when selected.
3. Complete one full daily form.
4. Add at least one gastrointestinal symptom with intensity, timing, modifying
   factor, quality-of-life impact, sleep interruption, and pain details.
5. Add stool details with Bristol classification.
6. Add one custom field.

Expected outcome: all values save, reload, and display in timeline/detail views
without losing required fields.

### 3. Offline-Lite Patient Text Entry

1. Open a patient day while online.
2. Disconnect internet.
3. Reopen the cached day.
4. Create a text entry.
5. Edit its timestamp.
6. Confirm pending sync state.
7. Restore internet.

Expected outcome: the entry syncs once, pending state clears, no duplicate row is
created, and unsupported offline actions remain blocked.

### 4. Photo Upload

1. Open an online patient meal or symptom entry.
2. Attach a large test photo.
3. Confirm preview.
4. Save/upload.
5. Inspect stored metadata and private storage object dimensions/sizes.
6. Attempt photo upload while offline.

Expected outcome: uploaded main image is JPEG, width <= 1280px, thumbnail exists,
original full-resolution file is not stored, metadata exists, and offline upload
is rejected with a clear message.

### 5. Voice Input

1. Set voice language to Serbian.
2. Use voice input in a text field where supported.
3. Edit transcript before saving.
4. Set voice language to English.
5. Repeat.
6. Test a browser/device where voice is unavailable.

Expected outcome: transcript appends to existing text, can be edited before
save, no raw audio is stored, and typing fallback remains available.

### 6. Doctor Invite Linking

1. Log in as manually provisioned doctor.
2. Create invite code.
3. Log in as patient.
4. Enter invite code on Link Doctor screen.
5. Return to doctor dashboard.
6. Attempt to reuse the same code.
7. Attempt to view an unlinked patient.

Expected outcome: patient links to doctor once, code reuse fails, linked patient
appears, and unlinked patient access is denied.

### 7. Doctor Exports

1. Log in as doctor.
2. Select linked patient.
3. Export selected day in all three modes.
4. Export current/partial month in all three modes.
5. Validate output against `contracts/export-json.schema.json`.
6. Inspect images-only export.

Expected outcome: export ranges are correct, entries are sorted, images-only mode
contains image references/labels/metadata only, all modes exclude base64 images,
and unlinked patient data is absent.

### 8. Role and RLS Security

1. Patient attempts to access another patient's entries/photos.
2. Doctor attempts to access unlinked patient data.
3. Doctor attempts to edit/delete linked patient entries.
4. Unauthenticated request attempts to read app data.

Expected outcome: all unauthorized access attempts fail and audit events are
recorded for denied access where applicable.

### 9. Language and Theme

1. Switch app language to Serbian.
2. Walk through patient timeline, forms, link doctor, doctor dashboard, export,
   and settings.
3. Switch app language to English.
4. Switch light/dark theme.

Expected outcome: main workflows use translated text, forms keep data while
switching where possible, and screens remain readable in both themes.

### 10. Web, Android, and Huawei Smoke

1. Run the first working slice on web.
2. Run the first working slice on Android APK.
3. Run the first working slice on Huawei Android APK if device is available.
4. Repeat photo, voice fallback, language, theme, and offline-lite smoke checks
   on each available platform.

Expected outcome: web and Android apps show the same data and workflow against
the shared backend, with platform-specific limitations documented.

## Completion Criteria

V1 is ready for implementation acceptance when all scenarios above pass or any
platform-specific limitation is explicitly documented and accepted by the product
owner.
