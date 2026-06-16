# Final Project Handoff: Medical Tracking Research MVP

## Executive Summary

Build a mobile-first patient/doctor medical tracking MVP for a three-month research pilot. Patients record meals, symptoms, medications, exercise, daily notes, custom fields, and photos. Doctors link to patients using invite codes, review active linked patient timelines, and export JSON research datasets. The MVP must include offline-lite text entry creation and sync, Serbian and English UI, free device/browser voice input, private compressed photo storage, Supabase RLS, and strict research data retention.

`Final MVP Decisions.pdf` is authoritative over `Product Development Plan.pdf`. Direct user decisions in this handoff are authoritative over both.

## Project Purpose

The app supports private tracking/research testing, not diagnosis. It helps patients capture structured daily data and helps a doctor/researcher review and export linked patient data for later research/AI analysis.

## Target Users / Personas

- **Patient / research participant**: Records entries, photos, symptoms, and notes; may be older or non-technical; needs large readable controls, Serbian/English UI, offline-lite support, and typing fallback.
- **Doctor / researcher**: Links to patients using invite codes, reviews timelines, adds separate doctor notes, and exports selected day/month JSON.
- **Programmer / implementation team**: Uses this handoff plus Spec Kit artifacts to choose stack, create `planning.md`, and implement without changing the MVP requirements.

## Scope

- Patient and doctor auth with one role per account.
- Consent/privacy gate before normal app use.
- Patient timeline/history, predefined entry types, custom fields, timestamp editing.
- Offline-lite cached own history, offline text entry creation, pending timestamp edits, pending-sync indicator, sync on reconnect.
- Doctor invite-code linking in MVP.
- Doctor dashboard for active linked patients only.
- Online photo upload with preview, resize/compress, thumbnail, private storage, metadata rows.
- Doctor-only JSON exports for selected day and selected month.
- Export modes: All data, All data with images, Images only with labels.
- Serbian and English UI from launch; Serbian/English voice language choices where supported.
- Light/dark theme.
- Local hide/delete state tracking without hard-deleting research data.
- Android APK, Huawei Android APK, and web app targets.

## Out Of Scope

- Full offline parity and complex multi-device conflict resolution.
- Offline photo upload.
- Fresh export while offline.
- Fetching new doctor/patient data while offline.
- Paid transcription APIs, OpenAI Whisper, or raw audio storage.
- Manual Supabase doctor-patient linking as the MVP workflow.
- Patient export buttons in MVP.
- Weekly exports from the older plan.
- Doctor editing/deleting patient-created entries.
- Automatic deletion during the three-month research period.
- Post-research cleanup/archive tooling, except as future plan.
- Full doctor-configurable dynamic form builder.
- In-app role switching for one account.

## Functional Requirements

Use `specs/001-medical-tracking-mvp/spec.md` as the detailed source. Key requirements:

- Enforce one role per account: patient or doctor.
- Require consent acceptance before app use.
- Support entry types: Meal, Symptom, Medication, Exercise, Daily note, Custom.
- Allow custom fields stored as structured data.
- Support offline-lite text entries and sync.
- Generate single-use invite codes that expire after 7 days and can be revoked before use.
- Restrict doctors to active linked patients.
- Compress photos to max width 1280px, JPEG quality 0.8; generate thumbnails.
- Store only private storage paths and metadata, never original images or base64 in Postgres.
- Retain entries, photos, and metadata during the three-month research period.
- Represent local hide/delete state in the database instead of physical deletion.
- Export day and month JSON in the three required modes.
- Use free device/browser speech recognition with typing fallback.
- Load Serbian/English UI text from translation files.
- Enforce RLS for all unrelated data access.

## Non-Functional Requirements

- Mobile-first, readable, older-user friendly, clean medical UI.
- Web-compatible and Android/Huawei APK compatible.
- Private data access by default.
- Supabase free-tier-conscious storage for 3-5 pilot users.
- Pending offline entry visible within 5 seconds.
- Pending entry sync within 30 seconds after connectivity returns under normal conditions.
- No public client exposure of service-role or secret keys.
- Verify current Supabase docs before implementing schema, RLS, Auth, or Storage code.

## Business Rules

- Source authority: direct user decisions > `Final MVP Decisions.pdf` > `Product Development Plan.pdf`.
- One account has one role. A person needing both doctor and patient access uses two accounts.
- Invite codes are single-use for MVP, expire after 7 days, and may be revoked before use.
- Doctor access requires active `doctor_patient_access`.
- Patient should be able to revoke doctor access later.
- Doctor notes are separate from patient entries.
- Doctor exports may include doctor notes only when selected.
- Research data is retained for the full three-month period.
- Local hide/delete is a visibility/lifecycle state, not physical deletion.

## User Stories

- **US1 P1**: Role-based access and consent.
- **US2 P1**: Patient timeline with online and offline-lite entries.
- **US3 P1**: Invite-code doctor linking.
- **US4 P2**: Online photo attachments with storage protection.
- **US5 P2**: Doctor dashboard and research exports.
- **US6 P2**: Voice, language, and theme preferences.
- **US7 P2**: Local hide/delete without research deletion.

## User Flows

### Doctor Linking

1. Doctor logs in.
2. Doctor opens Add Patient.
3. Doctor creates invite code.
4. App generates short single-use code.
5. Doctor gives code to patient.
6. Patient logs in and opens Link Doctor.
7. Patient enters invite code.
8. App creates active doctor-patient access row.
9. Doctor sees patient in dashboard.

### Offline-Lite Entry

1. Patient opens cached history.
2. Connectivity is unavailable.
3. Patient creates text entry.
4. App stores entry locally and shows Pending sync.
5. Patient edits pending timestamp if needed.
6. Connectivity returns.
7. App syncs once using client-generated UUID.
8. Pending indicator clears.

### Export

1. Doctor selects linked patient.
2. Doctor chooses day or month.
3. Doctor chooses export mode.
4. App validates active access.
5. App generates JSON with correct range.
6. Image modes use signed URLs; no base64 is embedded.

## UX/UI Notes

- Clean medical style; simple, readable, large controls.
- Mobile-first, web-compatible, not flashy or game-like.
- Light and dark modes.
- Serbian and English UI available from start.
- Settings include app language, voice language, and theme.
- Screens should be wireframed in Figma before implementation.
- Do not hardcode UI text in components.
- Voice input is a helper for text fields, not a separate data type.

## Roles and Permissions

- **Patient**: Own entries/photos/settings; create/edit own entries; add photos online; hide/locally delete own content; redeem invite codes; revoke doctor access.
- **Doctor**: Create/revoke invite codes; read active linked patients; create separate doctor notes; export linked patient data.
- **Unlinked doctor**: No access to patient data.
- **Unauthenticated user**: No research data access.

## Data Model

See `specs/001-medical-tracking-mvp/data-model.md`. Core entities:

- `profiles`
- `user_settings`
- `consent_acceptances`
- `doctor_invite_codes`
- `doctor_patient_access`
- `patient_entries`
- `entry_photos`
- `doctor_notes`
- `user_content_visibility_states`
- `export_audit_events`
- `storage_usage_estimates`

Critical modeling point: physical deletion is forbidden during the research period. Use visibility/lifecycle state rows to distinguish visible, hidden, and locally deleted content.

## API / Contracts / Integration Notes

See `specs/001-medical-tracking-mvp/contracts/api-contract.md`.

Required contracts:

- Current profile and consent acceptance.
- Create/revoke/redeem doctor invite code.
- List/create patient entries.
- Update patient entry timestamp.
- Set local content visibility state.
- Upload photo metadata after private storage upload.
- Generate doctor export.
- Enforce RLS and storage policies.

Supabase notes:

- Enable RLS on all exposed tables.
- Never use user-editable metadata for authorization decisions.
- Never expose service-role or secret keys in public clients.
- Use private storage and signed URLs.
- Verify current Supabase docs/changelog before implementation.

## Technical Implementation Plan

Recommended sequence:

1. Choose and record a cross-platform stack for Android APK, Huawei Android APK, and web.
2. Build Supabase schema, RLS, storage bucket, and policy tests first.
3. Build role/consent foundation.
4. Build patient timeline and offline-lite sync.
5. Build invite-code linking and doctor dashboard access enforcement.
6. Add photo handling and storage protection.
7. Add exports, voice, language/theme settings, and local hide/delete state.
8. Run quickstart validation and cross-platform smoke tests.

## Programmer Task Breakdown

Use `specs/001-medical-tracking-mvp/tasks.md` as the task source. It contains 68 ordered tasks across:

- Setup
- Foundational schema/RLS/storage/i18n/offline work
- US1 role and consent
- US2 patient entries and offline-lite sync
- US3 invite-code linking
- US4 photos
- US5 doctor dashboard and exports
- US6 voice/language/theme
- US7 local hide/delete retention
- Release checks

## Acceptance Criteria

V1 is done when:

- Patient can log in.
- Doctor can log in.
- Account role is respected.
- One account has one role.
- Consent is accepted before use.
- Doctor can generate invite code.
- Patient can link doctor using invite code.
- Doctor can see linked patient.
- Doctor cannot see unlinked patients.
- Patient can create online text entry.
- Patient can create offline text entry.
- Pending offline entry syncs when online.
- Patient can edit timestamp.
- Patient can view own timeline/history.
- Patient can add photo online.
- Patient can add photo later to an old entry.
- Photo is compressed before upload.
- Thumbnail is generated.
- Original photo is not uploaded.
- Private Supabase bucket is used.
- Voice input works where supported.
- Typing fallback works.
- Serbian/English UI switch works.
- Light/dark mode works.
- Doctor can export selected day JSON.
- Doctor can export current/partial month JSON.
- Export modes exist: All data, All data with images, Images only with labels.
- Local hide/delete preserves database research rows and records state.
- RLS prevents unrelated data access.
- Android APK works.
- Huawei APK works.
- Web app works.

## Testing Expectations

- Unit tests for range calculations, entry type validation, visibility state, and export payload builders.
- Integration tests for Supabase RLS, storage policies, invite redemption, offline sync idempotency, no-hard-delete retention, and export contracts.
- End-to-end tests for role/consent, entry creation, offline-lite sync, linking, photos, exports, language/theme/voice fallback.
- Manual/device smoke tests on Android, Huawei Android, and Chromium-based browser.
- Security review for service-role exposure, RLS gaps, storage access, and signed URL handling.

## Deployment / Setup Notes

- Maintain separate Supabase environments for development and production research use.
- Configure private storage bucket and safe per-file upload limit.
- Configure translation files before UI implementation.
- Configure study start/end dates before research use.
- Keep service-role credentials server-side only.
- Archive/export after each month as needed, but do not delete research data during MVP.
- Post-research cleanup/archive tooling is a future feature.

## Remaining Assumptions / Unresolved Questions

No blocking requirement questions remain for handoff creation.

Non-blocking assumptions for programmers to resolve before implementation:

- Exact frontend/mobile framework is not specified; choose one that supports Android APK, Huawei Android APK, and web.
- The three-month research period needs a configured study start/end date.
- Final legal consent wording in Serbian and English must be approved before release.
