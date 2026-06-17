# Feature Specification: V1 Patient Research Tracking App

**Feature Branch**: `001-patient-research-tracking`

**Created**: 2026-06-16

**Status**: Draft

**Input**: Intake files in `docs/intake/` plus clarification answers from 2026-06-16.

## Clarifications

### Session 2026-06-16

- Q: What stack should V1 target? -> A: Separate web and native Android apps, connected to the same database, showing the same data and workflow.
- Q: How should doctor accounts be created in V1? -> A: Doctor accounts are manually created in Supabase only for now.
- Q: What privacy/compliance level should V1 target? -> A: Use the recommended private research MVP approach for this workflow.
- Q: Are the full baseline profile and daily medical/symptom forms required in V1? -> A: Yes, full forms are required in V1.
- Q: Should doctor notes be part of V1? -> A: Future only; not part of V1.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Patient consents, logs in, and records a basic timeline entry (Priority: P1)

A patient accepts consent/privacy terms, logs in with a patient account, opens the
daily timeline, creates a timestamped text entry, saves it, and sees it displayed
on the timeline. This is the first working development slice.

**Why this priority**: It proves authentication, consent, patient role behavior,
entry creation, persistence, and timeline readback before larger V1 workflows are
added.

**Independent Test**: Create one patient account, accept consent, create a daily
note or custom text entry, edit the timestamp, save it, reload the app, and verify
the entry appears in the correct day timeline.

**Acceptance Scenarios**:

1. **Given** a new patient account without consent, **When** the patient logs in,
   **Then** the app requires consent acceptance before the main timeline opens.
2. **Given** a patient with accepted consent, **When** the patient creates a text
   entry with the current timestamp, **Then** the entry is saved and shown in the
   daily timeline in timestamp order.
3. **Given** a patient entering data retrospectively, **When** the patient edits
   the timestamp before saving, **Then** the entry appears on the timeline for the
   edited date and time.

---

### User Story 2 - Patient completes full baseline and daily medical forms (Priority: P1)

A patient records baseline profile information and complete daily research data,
including meals, symptoms, stool, sleep, stress, activity, medication, hydration,
menstruation where relevant, energy, naps, and custom fields.

**Why this priority**: The research value depends on complete structured data, not
only free-text timeline notes.

**Independent Test**: Complete a patient baseline profile and one full daily form
with at least one symptom, one meal, one stool record, one medication answer, and
one custom field, then verify all values remain available after reload.

**Acceptance Scenarios**:

1. **Given** a patient opening profile setup, **When** they enter general
   information, chronic illness, chronic therapy, weight, height, and relevant
   menstrual history, **Then** the baseline profile is saved and editable.
2. **Given** a patient completing daily tracking, **When** they record wake time,
   food, appetite, water, other fluids, physical activity, sleep, stress, day
   type, medicine outside chronic therapy, stool, menstruation, energy, naps, and
   notes, **Then** the daily timeline displays the submitted entries by timestamp.
3. **Given** a patient selecting a gastrointestinal symptom, **When** they provide
   start time, end time, intensity, quality-of-life impact, modifying factors,
   sleep interruption, and pain localization where relevant, **Then** those fields
   are stored with the symptom entry.

---

### User Story 3 - Patient uses offline-lite text tracking (Priority: P2)

A patient can continue basic text tracking when internet is unavailable, see
cached own history, create pending text entries, edit timestamps, and sync pending
entries when connectivity returns.

**Why this priority**: Field usage may happen with unreliable internet, but V1
must keep offline behavior intentionally narrow to avoid risky conflict handling.

**Independent Test**: Load a cached day, go offline, create a text entry, change
its timestamp, verify it is marked pending, reconnect, and verify it syncs once
without duplicate entries.

**Acceptance Scenarios**:

1. **Given** a patient has previously opened a day, **When** they lose internet,
   **Then** they can view that cached own day with an offline message.
2. **Given** a patient is offline, **When** they create a text entry and edit its
   timestamp, **Then** the entry is stored locally and marked "Pending sync".
3. **Given** a pending text entry exists, **When** internet returns, **Then** the
   app syncs it and replaces the pending state with the saved state.

---

### User Story 4 - Patient attaches photos and uses free voice input (Priority: P2)

A patient can add compressed photos to entries while online and use free
device/browser speech recognition across text fields where supported, with manual
typing fallback.

**Why this priority**: Photos and voice reduce patient effort and support later
research analysis, but they depend on the core entry workflow.

**Independent Test**: Add a photo to a meal entry, verify preview and upload of a
compressed image and thumbnail rather than the original, then dictate text in
Serbian or English and edit the transcript before saving.

**Acceptance Scenarios**:

1. **Given** a patient selects or takes a photo online, **When** they attach it to
   an entry, **Then** the app previews it, uploads a resized/compressed image and
   thumbnail, stores metadata, and does not upload the original full-resolution
   image.
2. **Given** the patient is offline, **When** they attempt to upload a photo,
   **Then** the app explains photo upload requires internet and keeps the entry
   editable for later attachment.
3. **Given** speech recognition is available, **When** the patient starts voice
   input in a text field, **Then** the transcript is appended to existing text and
   remains editable before saving.
4. **Given** speech recognition is unavailable, **When** the patient opens a text
   field, **Then** manual typing remains fully available without storing raw audio.

---

### User Story 5 - Doctor links to patients and views linked timelines (Priority: P2)

A manually created doctor account generates an invite code, gives it to a
patient, and after the patient enters it, the doctor can view that patient's
timeline while remaining blocked from unlinked patients.

**Why this priority**: Doctor review is central to the research workflow, and
invite-code linking replaces manual database linking in V1.

**Independent Test**: Create a doctor account manually, generate a single-use
code, link one patient, verify the doctor sees only that patient, revoke or expire
access/code states as applicable, and verify unrelated patients remain hidden.

**Acceptance Scenarios**:

1. **Given** a doctor account exists, **When** the doctor creates an invite code,
   **Then** the app generates a short single-use code that expires after 7 days.
2. **Given** a patient has a valid invite code, **When** they enter it on the
   Link Doctor screen, **Then** an active doctor-patient link is created and the
   invite code cannot be reused.
3. **Given** a doctor has active access to one patient, **When** the doctor opens
   the dashboard, **Then** only linked active patients are visible.
4. **Given** a doctor attempts to view an unlinked patient, **When** access is
   checked, **Then** the app denies access and exposes no patient data.

---

### User Story 6 - Doctor exports selected research data (Priority: P3)

A doctor exports JSON for a linked patient by selected day or selected/current
partial month, choosing all data, all data with images, or images only with
labels.

**Why this priority**: Export is needed for research analysis after data capture
and doctor linking are reliable.

**Independent Test**: Export a linked patient's selected day and current partial
month in all three modes, verify the JSON includes the correct date range and
mode-specific fields, and verify no unlinked patient data appears.

**Acceptance Scenarios**:

1. **Given** a doctor selects a linked patient and day, **When** they export all
   data, **Then** the JSON includes patient code, date range, entries sorted by
   timestamp, entry type, title, note text, custom fields, and metadata allowed
   for that mode.
2. **Given** a doctor selects the current month before month end, **When** they
   export the month, **Then** the range runs from month start to current date/time.
3. **Given** a doctor chooses images only with labels, **When** export completes,
   **Then** the JSON includes image access references, metadata, timestamps,
   labels, entry type, and no long symptom descriptions.

---

### User Story 7 - Patient customizes language, voice language, and theme (Priority: P3)

A patient or doctor can select Serbian or English UI, Serbian or English voice
language, and light or dark theme.

**Why this priority**: Bilingual and accessible presentation is required from the
start, but it can be layered after core data workflows.

**Independent Test**: Change app language and theme, verify major screens update
without losing data, then set voice language and verify the selected recognition
language is used where speech recognition is available.

**Acceptance Scenarios**:

1. **Given** a user opens settings, **When** they switch app language between
   Serbian and English, **Then** visible UI text changes without hardcoded
   strings remaining in the main workflows.
2. **Given** a user switches theme, **When** they revisit timeline, forms,
   doctor dashboard, and exports, **Then** screens remain readable in the
   selected theme.
3. **Given** a user selects Serbian or English voice language, **When** voice
   input starts, **Then** the app requests the selected recognition language where
   supported by the device/browser.

---

### Edge Cases

- User has no internet at login: show a clear offline message and prevent actions
  requiring authentication or fresh sync.
- Internet drops during save: keep patient text entry pending if eligible, or show
  a retryable failure for non-offline-supported actions.
- Patient attempts offline photo upload: block upload and allow later attachment
  when online.
- Doctor account is not manually provisioned: prevent self-service doctor role
  creation.
- Invite code is expired, revoked, invalid, or already used: show a clear error
  and do not create access.
- Patient revocation is future scope, but inactive/revoked access rows must block
  doctor visibility if present.
- Speech recognition is unsupported or unavailable for Serbian/English: keep
  typing fallback visible.
- Photo exceeds safe size or cannot be compressed: reject upload with a clear
  message and do not store the original.
- Patient has no data for selected export range: return a valid empty export
  package with patient code, date range, mode, and empty entries/images.
- Current month export is requested mid-month: end range at current date/time,
  not month end.
- User switches language/theme while forms contain unsaved data: preserve entered
  values or warn before discarding.
- Weight tracking reminder occurs after three months: prompt for weight update
  without blocking other daily tracking.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require authenticated access for all app data and
  workflows except public login/signup screens.
- **FR-002**: System MUST require consent/privacy acceptance before a user can
  access patient or doctor app workflows.
- **FR-003**: System MUST support exactly one role per account: patient or doctor.
- **FR-004**: System MUST prevent users from switching roles inside the same
  account.
- **FR-005**: System MUST support doctor accounts that are manually created by an
  administrator for V1.
- **FR-006**: System MUST prevent public self-service creation of doctor accounts
  in V1.
- **FR-007**: System MUST allow patient signup/login and doctor login.
- **FR-008**: System MUST allow patients to create, view, edit timestamp for, and
  delete their own entries.
- **FR-009**: System MUST automatically capture creation timestamp and allow
  retrospective timestamp editing before or after save where permitted.
- **FR-010**: System MUST show patient entries on a daily timeline sorted by
  timestamp.
- **FR-011**: System MUST provide complete baseline profile fields: sex, birth
  year, occupation, chronic diseases, chronic therapy, menstrual history where
  relevant, weight, recent major weight change, height.
- **FR-012**: System MUST prompt for patient weight at least every three months.
- **FR-013**: System MUST ask at baseline whether major weight changes occurred in
  the previous six months and capture amount when the answer is yes.
- **FR-014**: System MUST support predefined entry types: Meal, Symptom,
  Medication, Exercise, Daily note, and Custom.
- **FR-015**: System MUST support additional user-defined fields attached to the
  selected entry category.
- **FR-016**: System MUST provide daily fields for wake time, food intake,
  appetite, water intake, other fluids, physical activity, sleep duration and
  quality, stress level and description, day description, medication outside
  chronic therapy, menstruation, energy level, naps, and general notes.
- **FR-017**: System MUST support gastrointestinal symptom selection including
  bloating, pain, gas, stomach burning, heartburn, regurgitation, early satiety,
  belching, nausea, vomiting, blood presence, stomach heaviness, difficult
  swallowing, painful swallowing, false stool urgency, and other symptoms.
- **FR-018**: System MUST collect symptom start time, end time, intensity from
  1-3, quality-of-life impact, modifying factors, and whether the symptom woke
  the patient from sleep.
- **FR-019**: System MUST collect pain localization, radiation, pain description,
  and custom description when pain is selected.
- **FR-020**: System MUST collect stool occurrence, Bristol classification,
  urgency, pain, mucus, blood, fatty stool, and black stool when relevant.
- **FR-021**: System MUST make Bristol stool classification guidance available
  when stool classification is requested.
- **FR-022**: System MUST support offline-lite viewing of cached own history and
  previously cached days.
- **FR-023**: System MUST support offline creation of patient text entries and
  timestamp edits for pending text entries.
- **FR-024**: System MUST visibly mark offline-created text entries as pending
  sync until saved online.
- **FR-025**: System MUST sync pending patient text entries when internet returns
  and avoid duplicate synced entries.
- **FR-026**: System MUST exclude photo upload, fresh doctor/patient fetches, and
  fresh exports with signed image access from offline support.
- **FR-027**: System MUST let patients attach photos online during entry creation
  or later to an older entry.
- **FR-028**: System MUST preview selected photos before upload.
- **FR-029**: System MUST resize photos to max width 1280px while preserving
  aspect ratio.
- **FR-030**: System MUST compress uploaded photos as JPEG quality 0.8 and MUST
  not upload original full-resolution files.
- **FR-031**: System MUST generate thumbnails for uploaded photos.
- **FR-032**: System MUST store photo metadata and private file references, not
  base64 image data in app data records.
- **FR-033**: System MUST reject accidental huge photo uploads above a safe
  per-file limit.
- **FR-034**: System MUST track estimated storage usage and warn when usage
  approaches the storage budget.
- **FR-035**: System MUST provide reusable free voice input for all text fields
  where device/browser speech recognition is available.
- **FR-036**: System MUST support Serbian (`sr-RS`) and English (`en-US`) voice
  language preferences where supported.
- **FR-037**: System MUST append voice transcripts to existing text and allow
  editing before save.
- **FR-038**: System MUST never save raw audio and MUST NOT require a paid
  transcription service in V1.
- **FR-039**: System MUST provide typing fallback whenever voice recognition is
  unavailable.
- **FR-040**: System MUST allow doctors to generate short single-use invite codes
  that expire after 7 days and can be revoked before use.
- **FR-041**: System MUST allow patients to enter a valid invite code and create
  an active doctor-patient access link.
- **FR-042**: System MUST allow doctors to view only patients with active access.
- **FR-043**: System MUST prevent doctors from viewing unlinked or revoked
  patient data.
- **FR-044**: System MUST prevent doctors from editing or deleting
  patient-created entries in V1.
- **FR-045**: System MUST NOT include doctor note creation in V1.
- **FR-046**: System MUST allow doctors to export selected day JSON for linked
  patients.
- **FR-047**: System MUST allow doctors to export selected/current partial month
  JSON for linked patients.
- **FR-048**: System MUST support export modes: all data, all data with images,
  and images only with labels.
- **FR-049**: System MUST sort exported entries by timestamp and include patient
  code, date range, entry type, title, selected note text/custom fields, photo
  metadata, and image access references according to export mode.
- **FR-050**: System MUST NOT embed base64 images inside JSON exports.
- **FR-051**: System MUST keep all patient entries, photos, and metadata available
  during the three-month research period.
- **FR-052**: System MUST NOT automatically delete data in V1.
- **FR-053**: System MUST support Serbian and English UI from the start.
- **FR-054**: System MUST support app language, voice language, and light/dark
  theme settings.
- **FR-055**: System MUST use translation keys/files for UI text rather than
  hardcoded component text.
- **FR-056**: System MUST provide the same core workflows and data visibility in
  separate web and native Android apps.
- **FR-057**: System MUST protect patient-owned data so users cannot access
  unrelated patient rows, photos, links, or exports.
- **FR-058**: System MUST record security-relevant actions such as consent
  acceptance, invite creation/use/revocation, export creation, and denied access.
- **FR-059**: System MUST show clear offline, upload failure, permission denied,
  and sync failure messages.
- **FR-060**: System MUST support basic testing with one patient, one doctor, one
  bad/empty-data account, Android phone, Huawei Android phone if available, and
  web browser.

### Scope Boundaries

- **In scope for V1**: patient auth, manually provisioned doctor login, consent,
  patient timeline, full forms, offline-lite text entries, online photos, free
  voice input, invite-code doctor linking, doctor timeline viewing, doctor JSON
  exports, bilingual UI, light/dark theme, privacy controls, and web plus Android
  native app workflows.
- **Out of scope for V1**: doctor note creation, paid transcription APIs, raw
  audio storage, full offline sync, offline photo upload, automatic deletion,
  archive cleanup tooling after the research period, iOS release, formal medical
  diagnosis, and formal compliance certification.

### Key Entities *(include if feature involves data)*

- **User Account**: Authenticated account with one role, patient or doctor.
- **User Profile**: Role-specific profile, app language, voice language, theme,
  and consent state.
- **Consent Acceptance**: Accepted consent/privacy version, timestamp, and user.
- **Patient Baseline Profile**: General demographic and health baseline fields,
  including weight/height and recent weight-change details.
- **Patient Entry**: Timestamped patient-owned record with type, title, notes,
  predefined fields, custom fields, and sync state where relevant.
- **Symptom Detail**: Structured symptom data linked to an entry, including
  timing, intensity, quality-of-life effect, modifying factors, and pain details.
- **Stool Detail**: Stool occurrence and Bristol-related structured fields.
- **Entry Photo**: Compressed photo and thumbnail metadata linked to an entry.
- **Doctor Invite Code**: Single-use doctor-generated code with status,
  expiration, max uses, used count, and timestamps.
- **Doctor Patient Access**: Link between doctor and patient with active or
  revoked status.
- **Export Package**: Generated JSON result for a doctor-selected patient, date
  range, and export mode.
- **Audit Event**: Security-relevant event for consent, linking, access denial,
  and export actions.
- **Local Pending Entry**: Offline-lite patient text entry waiting for sync.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A patient can complete consent, login, create a timestamped text
  entry, save it, reload, and see it in the timeline in under 5 minutes during a
  guided acceptance test.
- **SC-002**: 100% of role-boundary tests pass: patient cannot access another
  patient's data, doctor cannot access unlinked patients, and doctor cannot edit
  patient entries.
- **SC-003**: A full baseline profile and one full daily medical/symptom day can
  be completed and re-opened with no lost required fields.
- **SC-004**: Offline-lite test completes with one pending text entry syncing
  once within 60 seconds of connection returning.
- **SC-005**: Every uploaded test photo is stored as a compressed JPEG with max
  width at or below 1280px, has a thumbnail, and does not store the original
  full-resolution file.
- **SC-006**: Voice input acceptance tests pass on at least one supported
  Chromium-based browser or Android device, and typing fallback works on an
  unsupported environment.
- **SC-007**: Invite-code flow links one patient to one doctor using a single-use
  code, rejects reuse, and hides unlinked patients.
- **SC-008**: Doctor day and current/partial month exports pass schema checks in
  all three export modes and contain no base64-encoded images.
- **SC-009**: Serbian and English UI language settings update the main patient
  and doctor workflows without visible hardcoded strings in those workflows.
- **SC-010**: Light and dark theme checks pass on web, Android APK, and Huawei
  Android APK where a Huawei device is available.

## Assumptions

- V1 is a private research MVP, not a diagnosis tool and not a formal certified
  medical device or formal compliance-certified platform.
- Doctor accounts are manually created in Supabase for V1.
- The implementation plan may choose separate React web and React Native Android
  apps sharing backend contracts and data rules.
- The V1 native target is Android APK, including Huawei Android testing when a
  Huawei device is available; iOS is future scope.
- Patient revocation of doctor access is planned for a later version, but revoked
  rows must be respected if present.
- Doctor notes are future scope and must not be included in V1 implementation
  tasks.
- Archive/export after each month is supported through doctor exports; automated
  cleanup after the three-month research period is future scope.
- If speech recognition is not available in a browser/device or language, manual
  typing is an acceptable fallback.
