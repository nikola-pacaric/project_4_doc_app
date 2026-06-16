# Feature Specification: Medical Tracking Research MVP

**Feature Branch**: `001-medical-tracking-mvp`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User requested a SpecAgent documentation-only pass using `docs/intake/Final MVP Decisions.pdf` as authoritative over `docs/intake/Product Development Plan.pdf`, plus direct decisions about offline-lite, invite codes, Serbian UI, and non-deletion of research data.

## Clarifications

### Session 2026-06-14

- Direct user decision: `Final MVP Decisions.pdf` wins over `Product Development Plan.pdf` when they conflict.
- Direct user decision: MVP includes offline-lite patient entry creation and sync.
- Direct user decision: doctor-patient linking uses invite codes in MVP.
- Direct user decision: MVP ships Serbian UI as well as English UI.
- Direct user decision: research data must not be deleted from the database; local hide/delete states must be represented in the database.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Role-Based Access and Consent (Priority: P1)

Patients and doctors can create or access accounts with exactly one role, accept the consent/privacy screen, and land in the correct patient or doctor experience.

**Why this priority**: Every workflow depends on a known role, accepted consent, and secure role-bound access.

**Independent Test**: Create one patient and one doctor account, accept consent for each, verify each account sees only role-appropriate navigation and cannot switch roles in-app.

**Acceptance Scenarios**:

1. **Given** a new patient account, **When** the user accepts consent, **Then** the app stores consent acceptance and opens the patient timeline experience.
2. **Given** a new doctor account, **When** the user accepts consent, **Then** the app stores consent acceptance and opens the doctor dashboard experience.
3. **Given** any authenticated user, **When** the user tries to access a screen or operation for the other role, **Then** access is denied.

---

### User Story 2 - Patient Timeline With Online and Offline-Lite Entries (Priority: P1)

Patients can view their own cached history, create text entries for predefined entry types, add custom fields, edit timestamps for pending entries, and sync pending entries when connectivity returns.

**Why this priority**: The research value starts with reliable patient self-tracking, including bad-connectivity situations.

**Independent Test**: With a patient account, create an online entry, go offline, create a text entry, edit its timestamp while pending, return online, and verify the entry syncs once with a pending-sync indicator cleared.

**Acceptance Scenarios**:

1. **Given** a patient is online, **When** they create a meal entry with custom fields, **Then** the entry appears on the timeline and is persisted for research.
2. **Given** a patient has previously cached history, **When** connectivity is unavailable, **Then** the patient can open cached own history and create a pending text entry.
3. **Given** a pending offline entry, **When** the patient edits its timestamp before sync, **Then** the edited timestamp is preserved during sync.

---

### User Story 3 - Invite-Code Doctor Linking (Priority: P1)

Doctors can generate short single-use invite codes, give them to patients, and patients can redeem valid codes to create active doctor-patient access.

**Why this priority**: Manual Supabase linking is explicitly out of scope for MVP; the doctor dashboard depends on invite-code relationships.

**Independent Test**: Doctor creates an invite code, patient redeems it before expiry, doctor sees the patient, unrelated doctor accounts do not see the patient, and the same code cannot be reused.

**Acceptance Scenarios**:

1. **Given** a doctor account, **When** the doctor creates an invite code, **Then** the code is single-use, expires after 7 days, and can be revoked before use.
2. **Given** a patient account and a valid code, **When** the patient enters the code, **Then** an active doctor-patient access row is created.
3. **Given** a revoked, expired, or already used code, **When** a patient tries to redeem it, **Then** redemption fails with a clear message.

---

### User Story 4 - Online Photo Attachments With Storage Protection (Priority: P2)

Patients can add compressed photos online, generate thumbnails, and later attach a photo to an older entry without uploading full-resolution originals.

**Why this priority**: Photos improve research quality, but they depend on the entry foundation and storage budget controls.

**Independent Test**: Attach a large photo online, verify the preview, compressed upload, thumbnail metadata, private storage paths, file-size guard, and that no original or base64 data is stored.

**Acceptance Scenarios**:

1. **Given** a patient is online, **When** they select or take a photo, **Then** the app previews, resizes to max width 1280px, compresses JPEG quality 0.8, generates a thumbnail, and uploads to private storage.
2. **Given** a patient is offline, **When** they try to upload a photo, **Then** the app explains that photo upload requires connectivity.
3. **Given** an older entry exists, **When** the patient is online, **Then** the patient can attach a photo to that entry.

---

### User Story 5 - Doctor Dashboard and Research Exports (Priority: P2)

Doctors can view timelines for actively linked patients and export selected-day or selected-month JSON in the required modes.

**Why this priority**: Research review and export are the doctor-side deliverables for the three-month study.

**Independent Test**: With an active linked patient, export a selected day and a partial current month in all required modes; verify unlinked patients are inaccessible and image modes use signed URLs rather than embedded base64.

**Acceptance Scenarios**:

1. **Given** a doctor has active access to a patient, **When** the doctor opens the dashboard, **Then** the patient appears and their timeline is readable.
2. **Given** a doctor has no active access to a patient, **When** the doctor tries to view or export that patient, **Then** access is denied.
3. **Given** today is inside the selected month, **When** the doctor exports that month, **Then** the export covers month start through current date/time, not future dates.

---

### User Story 6 - Voice, Language, and Theme Preferences (Priority: P2)

Users can switch UI language between Serbian and English, choose Serbian or English voice language where supported, use reusable voice input across text fields, and switch light/dark theme.

**Why this priority**: Serbian UI is in MVP, and voice input improves usability for medical tracking.

**Independent Test**: Switch UI language and theme, use voice input in a text field when supported, verify transcript appends to existing text and remains editable, and verify typing fallback when recognition is unavailable.

**Acceptance Scenarios**:

1. **Given** any user, **When** they select Serbian UI, **Then** app UI labels render from Serbian translations.
2. **Given** a text field and supported browser/device speech recognition, **When** the user dictates, **Then** transcript appends and remains editable before saving.
3. **Given** voice input is unavailable, **When** the user opens a text field, **Then** manual typing remains fully usable.

---

### User Story 7 - Local Hide/Delete Without Research Deletion (Priority: P2)

Users can hide or locally delete their own entries/photos from their device/profile view while the database retains the underlying research data and records the local state.

**Why this priority**: The user explicitly required database retention and state tracking for local hide/delete actions.

**Independent Test**: Hide and locally delete an entry/photo, verify it disappears from the default user view, verify the original row still exists, verify a visibility/lifecycle state row records the action, and verify research export can include the retained item and its state.

**Acceptance Scenarios**:

1. **Given** a patient owns an entry, **When** they hide it locally, **Then** the default timeline omits it for that profile and the database records a hidden state.
2. **Given** a patient locally deletes an entry or photo, **When** the operation completes, **Then** the row is not physically deleted and the database records a locally deleted state.
3. **Given** a doctor exports research data, **When** retained data includes hidden or locally deleted items, **Then** export metadata distinguishes visible, hidden, and locally deleted states.

### Edge Cases

- Invite code is expired, revoked, already used, malformed, or belongs to a deleted/revoked doctor account.
- Patient attempts to redeem their own doctor account code using the same account; this is blocked because one account has one role.
- Connectivity drops during pending-entry sync; pending state remains and retry is safe.
- The same offline pending entry syncs more than once due to retry; client-generated UUID prevents duplicates.
- User opens cached history offline before any data has been cached; show an empty/offline state rather than an error.
- Browser/device speech recognition is unavailable or unsupported for `sr-RS`; typing fallback remains available.
- Image compression cannot reach target size; upload is blocked if it exceeds the safe per-file limit.
- Signed image URLs expire; export generation must create fresh signed URLs on demand.
- Doctor access is revoked after data was viewed; subsequent dashboard and export requests are denied.
- User attempts physical deletion during the research period; system records local state and preserves research rows.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support authenticated patient and doctor accounts.
- **FR-002**: System MUST enforce exactly one role per account: `patient` or `doctor`.
- **FR-003**: System MUST prevent in-app role switching for MVP.
- **FR-004**: System MUST require consent/privacy acceptance before normal app use.
- **FR-005**: Consent text MUST state that the app is for private tracking/research testing, is not a diagnosis tool, may include food, symptoms, notes, and photos, may be reviewed by linked doctors, may be exported for research analysis, and supports data deletion requests.
- **FR-006**: System MUST provide patient entry types: Meal, Symptom, Medication, Exercise, Daily note, and Custom.
- **FR-007**: System MUST provide basic predefined fields for each predefined entry type.
- **FR-008**: System MUST allow users to add extra fields associated with an entry type/category.
- **FR-009**: System MUST store extra fields as structured custom field data.
- **FR-010**: Patients MUST be able to create timestamped text entries online.
- **FR-011**: Patients MUST be able to edit entry timestamps.
- **FR-012**: Patients MUST be able to view their own timeline/history.
- **FR-013**: Offline-lite mode MUST support viewing cached own history and previously cached days.
- **FR-014**: Offline-lite mode MUST support creating text entries locally.
- **FR-015**: Offline-lite mode MUST support editing timestamps for pending entries.
- **FR-016**: Offline-lite mode MUST show a clear pending-sync state.
- **FR-017**: Offline-lite mode MUST sync pending entries when connectivity returns.
- **FR-018**: Offline mode MUST NOT support photo upload, fresh export with signed image URLs, fetching new doctor/patient data, or complex multi-device conflict resolution.
- **FR-019**: Voice input offline MUST be best-effort and fall back to typing if device/browser support is unavailable.
- **FR-020**: Doctors MUST be able to generate short single-use invite codes.
- **FR-021**: Invite codes MUST expire after 7 days.
- **FR-022**: Doctors MUST be able to revoke unused invite codes.
- **FR-023**: Patients MUST be able to redeem valid invite codes from a Link Doctor screen.
- **FR-024**: Successful invite code redemption MUST create an active doctor-patient access row.
- **FR-025**: Doctors MUST only view patients with active access.
- **FR-026**: Patients SHOULD be able to revoke doctor access after linking.
- **FR-027**: Photo uploads MUST only be available while online.
- **FR-028**: Photo upload flow MUST preview the selected/taken image before upload.
- **FR-029**: System MUST resize photos client-side to max image width 1280px while preserving aspect ratio.
- **FR-030**: System MUST compress main photos as JPEG quality 0.8.
- **FR-031**: System MUST generate thumbnails for photos.
- **FR-032**: System MUST upload compressed images and thumbnails to private Supabase Storage.
- **FR-033**: System MUST store image paths and metadata in the database.
- **FR-034**: System MUST NOT store base64 image data in Postgres.
- **FR-035**: System MUST NOT upload original full-size images.
- **FR-036**: System MUST allow photos to be added later to old entries while online.
- **FR-037**: System MUST track estimated storage usage and warn as project/user storage budget is approached.
- **FR-038**: Storage MUST reject files above a safe per-file limit.
- **FR-039**: System MUST retain patient entries, photos, and metadata for the full three-month research period.
- **FR-040**: System MUST NOT perform automatic deletion in MVP.
- **FR-041**: Users MAY hide/delete data locally on their device/profile, but the database MUST retain the research data and record the local hidden/deleted state.
- **FR-042**: Doctors MUST be able to export selected-day JSON.
- **FR-043**: Doctors MUST be able to export selected-month JSON, including partial current months.
- **FR-044**: Day export range MUST be selected date 00:00 to next day 00:00.
- **FR-045**: Month export range MUST be month start to the earlier of current date/time or month end.
- **FR-046**: Export modes MUST include All data, All data with images, and Images only with labels.
- **FR-047**: All Data export MUST include patient code, date range, entries, timestamps, entry type, title, note text, custom fields, and selected doctor notes when included.
- **FR-048**: All Data With Images export MUST include All Data fields plus photo metadata and signed image URLs.
- **FR-049**: Images Only With Labels export MUST include image signed URLs, image metadata, timestamp, entry label/title, entry type, and label for what the image belongs to, without long notes or symptom descriptions.
- **FR-050**: Exports MUST NOT embed base64 image data.
- **FR-051**: Voice input MUST be reusable across all text fields.
- **FR-052**: Voice input MUST use free device/browser speech recognition only.
- **FR-053**: Voice input MUST support Serbian `sr-RS` and English `en-US` where available.
- **FR-054**: Voice input MUST append transcript to existing text and allow edits before saving.
- **FR-055**: System MUST NOT store raw audio.
- **FR-056**: UI MUST support Serbian and English from the start.
- **FR-057**: UI text MUST come from translation files and MUST NOT be hardcoded in components.
- **FR-058**: Settings MUST include app language, voice language, and theme options.
- **FR-059**: UI MUST support light mode and dark mode.
- **FR-060**: UI MUST be simple, readable, mobile-first, web-compatible, older-user friendly, and not flashy/game-like.
- **FR-061**: Supabase RLS MUST prevent unrelated data access.
- **FR-062**: Doctor notes MUST be stored separately from patient entries.
- **FR-063**: Doctors MUST NOT edit or delete patient-created entries in MVP.
- **FR-064**: MVP MUST run as Android APK, Huawei Android APK, and web app.

### Key Entities *(include if feature involves data)*

- **Profile**: Authenticated user profile with one role, patient code, settings references, and consent state.
- **Consent Acceptance**: Record of user acceptance, version, timestamp, language, and consent text version.
- **Doctor Invite Code**: Single-use, expiring, revocable code created by a doctor.
- **Doctor Patient Access**: Relationship granting a doctor active or revoked access to a patient.
- **Patient Entry**: Timestamped patient-created tracking record with entry type, title, note text, and custom fields.
- **Entry Photo**: Compressed photo and thumbnail metadata linked to a patient entry.
- **Doctor Note**: Doctor-authored note stored separately from patient-created entries.
- **User Content Visibility State**: Per-user/profile/device local visible, hidden, or locally deleted state for retained research content.
- **Sync Item**: Client-side pending mutation metadata used to sync offline-created text entries safely.
- **Export Request/Audit**: Doctor export metadata for selected day/month and export mode.
- **Storage Usage Estimate**: Estimated usage counters for warning and upload protection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A patient can log in, accept consent, create an online text entry, and see it on their timeline in under 2 minutes after account setup.
- **SC-002**: A patient can create an offline text entry and see it marked pending within 5 seconds while offline.
- **SC-003**: A pending offline text entry syncs exactly once within 30 seconds after connectivity returns under normal network conditions.
- **SC-004**: A doctor can generate an invite code and a patient can redeem it successfully before expiry in under 3 minutes.
- **SC-005**: Reused, revoked, expired, and malformed invite codes are rejected in 100% of validation tests.
- **SC-006**: RLS tests prove doctors cannot read unlinked patient entries, photos, or exports.
- **SC-007**: Photo upload never stores original full-resolution images or base64 image data in database verification tests.
- **SC-008**: Main uploaded photos target 250-500 KB where source image characteristics allow, with hard rejection above the configured safe per-file limit.
- **SC-009**: Thumbnail files target 20-60 KB where source image characteristics allow.
- **SC-010**: Day and month export JSON validates against the export contract for all three export modes.
- **SC-011**: Current-month exports include only data through current date/time.
- **SC-012**: Serbian/English UI switching updates visible app text without code changes or redeploy.
- **SC-013**: Voice input falls back to manual typing on unsupported browsers/devices without blocking entry creation.
- **SC-014**: Local hide/delete actions preserve database rows and create trackable visibility state in 100% of retention tests.
- **SC-015**: Smoke tests pass on Android phone, Huawei Android phone, and Chromium-based web browser before V1 release.

## Assumptions

- Supabase remains the backend platform for Auth, Postgres, Storage, and RLS.
- Exact frontend/mobile framework is not specified by intake; programmers should choose a cross-platform stack that can ship Android APK, Huawei Android APK, and web from one codebase or tightly coordinated codebases.
- The three-month retention window starts from the configured research study start date, not from each individual row creation date, unless the research owner later defines a different rule.
- Local hide/delete hides content from the acting user's default local/profile view but does not physically delete research rows or storage objects during the research period.
- Doctor exports include visibility/deletion state metadata so retained research rows remain interpretable.
- Final legally approved consent wording is supplied by the product owner before release; this spec defines required concepts, not legal copy.
