# App Contracts: V1 Patient Research Tracking App

## Purpose

These contracts keep the separate web and Android apps behaviorally aligned. Both
apps must use the same backend data, form schemas, validation rules, translation
keys, photo rules, sync semantics, and export semantics.

## Shared Workflow Contract

Both apps must expose equivalent workflows:

1. Login/signup for patients.
2. Login for manually provisioned doctors.
3. Consent/privacy acceptance before main workflows.
4. Patient daily timeline.
5. Patient baseline profile.
6. Patient full daily tracking forms.
7. Entry creation, timestamp edit, timeline readback, and delete.
8. Offline-lite cached own history and pending text entries.
9. Online photo attachment to new and old entries.
10. Voice helper for all text fields where supported.
11. Doctor invite-code generation.
12. Patient Link Doctor screen.
13. Doctor dashboard with linked patient list.
14. Doctor linked-patient timeline.
15. Doctor day/month export with mode selection.
16. Settings for app language, voice language, and light/dark theme.

## Route and Screen Contract

| Workflow | Web Route | Android Screen | Role |
|----------|-----------|----------------|------|
| Login | `/login` | `LoginScreen` | patient, doctor |
| Signup | `/signup` | `SignupScreen` | patient only |
| Consent | `/consent` | `ConsentScreen` | patient, doctor |
| Patient timeline | `/patient/timeline/:date?` | `PatientTimelineScreen` | patient |
| Baseline profile | `/patient/profile` | `PatientProfileScreen` | patient |
| Add/edit entry | `/patient/entries/:id?` | `EntryEditorScreen` | patient |
| Full daily form | `/patient/daily/:date` | `DailyFormScreen` | patient |
| Link doctor | `/patient/link-doctor` | `LinkDoctorScreen` | patient |
| Settings | `/settings` | `SettingsScreen` | patient, doctor |
| Doctor dashboard | `/doctor` | `DoctorDashboardScreen` | doctor |
| Doctor patient timeline | `/doctor/patients/:patientId/timeline/:date?` | `DoctorPatientTimelineScreen` | doctor |
| Doctor exports | `/doctor/patients/:patientId/exports` | `DoctorExportScreen` | doctor |

## Form Contract

Shared form definitions must define:

- Entry categories and labels.
- Required/optional fields.
- Field types and validation rules.
- Serbian and English translation keys.
- Conditional display logic.
- Export label mapping.

Required V1 form groups:

- Baseline profile.
- Meal.
- Symptom.
- Medication.
- Exercise.
- Daily note.
- Custom.
- Daily form.
- Stool.
- Menstruation.
- Nap.

Custom fields:

- Custom fields belong to a selected category.
- Custom field values are stored under the entry's `custom_fields`.
- Full doctor-configurable form builder is future scope.

## Offline-Lite Contract

Supported offline:

- Show "You are offline. Data cannot be synced right now." or localized
  equivalent.
- View cached own history and previously cached days.
- Create patient text entries.
- Edit timestamps for pending entries.
- Save pending entries locally.
- Show "Pending sync" or localized equivalent.
- Sync pending text entries when online returns.

Not supported offline:

- Login requiring fresh authentication.
- Photo upload.
- Fresh exports with signed image access.
- Fresh doctor/patient data fetch.
- Complex multi-device conflict resolution.

Sync rules:

- Each local pending entry must have a stable local id.
- Sync success must replace local pending state with server id.
- Retry failures must preserve user-entered data and show retryable status.
- Duplicate prevention must use local id/idempotency metadata or equivalent.

## Photo Contract

Photo upload flow:

1. User selects/takes photo.
2. App previews selected image.
3. App resizes and compresses the main image client-side.
4. App generates thumbnail client-side.
5. App uploads compressed image and thumbnail to private storage.
6. App stores only paths and metadata in app data.
7. App never uploads the original full-resolution image.
8. App never stores base64 image data in rows or exports.

Rules:

- Max width: 1280px.
- Main image format: JPEG.
- JPEG quality: 0.8.
- Target main size: 250-500 KB when possible.
- Target thumbnail size: 20-60 KB when possible.
- Offline photo upload is blocked.
- Photos may be attached later to old entries.
- Upload errors must be clear and retryable.

## Voice Contract

Voice input is a reusable helper for all text fields.

Rules:

- Use free device/browser speech recognition only.
- Supported language preferences: `sr-RS`, `en-US`.
- Append recognized transcript to existing text.
- User must be able to edit transcript before save.
- Never store raw audio.
- No paid transcription API in V1.
- Manual typing fallback must always be available.

## Export Contract

Doctor-only exports:

- Selected day.
- Selected/current partial month.
- Modes: `all_data`, `all_data_with_images`,
  `images_only_with_labels`.

Shared behavior:

- Only linked active patient data may be exported.
- Entries sorted by timestamp.
- No base64 image data.
- Image access references included only in modes that require images.
- Images-only mode excludes long symptom descriptions and notes.

## Localization Contract

- UI languages: Serbian and English.
- Voice languages: Serbian and English.
- Translation files must define all text used by core patient and doctor
  workflows.
- Components must use translation keys, not hardcoded user-visible strings.
- Language switching must not discard unsaved form data.

## Theme Contract

- Light and dark themes required in V1.
- System theme is optional later.
- Timeline, forms, dashboard, export screens, consent, and settings must remain
  readable in both themes.

## Error Message Contract

Messages must be localized and clear for:

- Offline/no sync.
- Photo upload failure.
- Voice unavailable.
- Invalid/expired/revoked/used invite code.
- Permission denied.
- Export unavailable/offline.
- Sync failed/retry pending.
