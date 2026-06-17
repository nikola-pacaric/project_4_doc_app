# Final Project Handoff: V1 Patient Research Tracking App

**Date**: 2026-06-16
**Spec Kit feature**: `specs/001-patient-research-tracking/`
**Status**: Ready for programmer planning and implementation. No application
source code has been implemented in this specification workflow.

## Executive Summary

Build V1 as two separate apps, a web app and a native Android app, connected to
the same Supabase backend and showing the same data, roles, forms, and workflows.
The app supports patient-owned medical research tracking for a small 3-month
pilot, manually provisioned doctor accounts, invite-code doctor-patient linking,
full baseline/daily/symptom forms, offline-lite patient text tracking, compressed
private photos, free device/browser voice input, doctor-only JSON exports,
Serbian/English UI, and light/dark theme.

Recommended implementation structure: monorepo with `apps/web`, `apps/mobile`,
`apps/supabase`, and shared packages for contracts, forms, i18n, photo handling,
sync, Supabase client wrappers, and UI tokens.

## Project Purpose

The product is a private tracking/research app for patients to record nutrition,
symptoms, daily context, photos, medication, sleep, stress, stool details, and
related health information. Linked doctors can review patient timelines and
export selected research data. The app is not a diagnosis tool and V1 does not
claim formal medical-device or compliance certification.

## Target Users / Personas

- **Patient**: Records baseline health information and daily structured entries,
  attaches photos, uses voice input where available, can work offline for basic
  text entries, and owns their data.
- **Doctor**: Manually created in Supabase, generates invite codes, views only
  linked patient timelines, and exports selected day/month JSON. Doctors do not
  edit patient entries and do not create notes in V1.
- **Administrator / Developer Operator**: Manually provisions doctor accounts,
  manages Supabase project configuration, monitors storage budget, and supports
  testing/deployment.

## Scope

In V1:

- Patient signup/login and doctor login.
- Consent/privacy screen before app use.
- One role per account: `patient` or `doctor`.
- Doctor accounts manually created in Supabase.
- Invite-code linking from doctor to patient.
- Patient timeline and timestamped entry creation.
- Full baseline profile and full daily medical/symptom forms.
- Offline-lite for cached own history and pending patient text entries.
- Online photo upload with compression, thumbnail, metadata, and private storage.
- Free voice input helper for text fields where supported.
- Doctor dashboard and linked patient timeline viewing.
- Doctor selected day and selected/current partial month JSON exports.
- Serbian/English UI, Serbian/English voice language setting, light/dark theme.
- RLS/security tests, web validation, Android APK validation, Huawei Android
  validation when a Huawei device is available.

## Out Of Scope

- Doctor note creation.
- Patient revocation UI, though revoked rows must be respected if present.
- Paid transcription APIs and raw audio storage.
- Full offline sync and multi-device conflict resolution.
- Offline photo upload.
- Automatic deletion during the 3-month research period.
- Archive cleanup tool after the research period.
- iOS release.
- Formal medical diagnosis, medical-device certification, or formal compliance
  certification.

## Functional Requirements

- Authentication and consent are required before app workflows.
- Public signup creates patient accounts only; doctor accounts are manual.
- Each account has one immutable role.
- Patients can create, view, timestamp-edit, and delete their own entries.
- Doctors can view only linked active patients and cannot edit/delete patient
  entries.
- Baseline profile must include sex, birth year, occupation, chronic diseases,
  chronic therapy, menstrual history where relevant, weight, height, and recent
  major weight change.
- Weight reminder must trigger at least every three months.
- Entry types: Meal, Symptom, Medication, Exercise, Daily note, Custom, plus
  daily/stool/menstruation/nap details as needed.
- Daily fields include wake time, food, appetite, water, other fluids, physical
  activity, sleep, stress, day description, medication outside chronic therapy,
  menstruation, energy, naps, and notes.
- Symptom fields include intake symptom list, start/end time, intensity 1-3,
  quality-of-life effect, modifying factors, sleep interruption, pain location,
  pain radiation, pain description, and custom symptom description.
- Stool fields include Bristol classification, urgency, pain, mucus, blood,
  fatty stool, and black stool.
- Offline-lite supports cached own history, cached days, pending text entries,
  timestamp edits, pending sync marker, and sync on reconnect.
- Offline-lite excludes photo upload, fresh exports, fresh doctor/patient fetch,
  and complex conflict handling.
- Photos must be previewed, resized to max width 1280px, JPEG quality 0.8,
  thumbnailed, uploaded to private storage, and stored as metadata/path rows only.
- No original full-resolution upload and no base64 image storage.
- Voice input must use free device/browser recognition, support `sr-RS` and
  `en-US` where available, append transcript to existing text, allow edits before
  save, and fall back to typing.
- Doctor invite codes are short, single-use, revocable before use, expire after 7
  days, and create active doctor-patient access when redeemed.
- Doctor exports support selected day and current/partial month.
- Export modes: all data, all data with images, images only with labels.
- JSON exports must never embed base64 images.
- UI text must use translation files/keys, not hardcoded component strings.

## Non-Functional Requirements

- Patient timeline should open recent/cached day in under 2 seconds after initial
  login on typical test devices.
- Online text entry save should return visible success or retryable failure in
  under 2 seconds on normal connectivity.
- Offline text entry should sync within 60 seconds after connectivity returns.
- Day/month exports should complete in under 30 seconds for expected V1 pilot
  data volumes.
- RLS must be enabled on all exposed app tables.
- Service-role keys must never be shipped in web or mobile clients.
- Main image target size: 250-500 KB where possible; thumbnail target: 20-60 KB.
- Storage budget warnings must prevent accidental huge uploads.
- UI must be clean, readable, medical-style, older-user friendly, mobile-first,
  web-compatible, and support light/dark themes.

## Business Rules

- Patient owns patient-created data.
- Doctor can only read data from active linked patients.
- Doctor cannot edit or delete patient-created entries in V1.
- Doctor notes are future only.
- Doctor accounts are manually provisioned in Supabase.
- No data is automatically deleted during the 3-month research period.
- Monthly exports are allowed during the research period; data remains in
  Supabase until research completion.
- After 3 months, full dataset export/archive and optional cleanup can be built
  later.

## User Stories

1. **P1 Patient first slice**: consent, login, daily timeline, add timestamped text
   entry, save/read/display.
2. **P1 Full forms**: patient completes baseline and daily medical/symptom/stool
   forms with custom fields.
3. **P2 Offline-lite**: patient views cached own days, creates pending text entry,
   edits timestamp, syncs on reconnect.
4. **P2 Photos and voice**: patient attaches compressed private photos online and
   uses editable free voice input where supported.
5. **P2 Doctor linking**: doctor generates invite code, patient redeems it,
   doctor sees only linked active patients.
6. **P3 Doctor exports**: doctor exports linked patient day/month JSON in three
   modes.
7. **P3 Settings**: users select app language, voice language, and theme.

## User Flows

**Patient first slice**:
Login/signup -> consent -> timeline -> add text entry -> edit timestamp -> save
-> reload -> timeline readback.

**Full daily tracking**:
Timeline/day -> daily form -> meal/symptom/stool/medication/exercise/note/custom
fields -> save -> timeline detail view.

**Offline-lite**:
Open day online -> connection lost -> view cached day -> create text entry ->
mark pending -> reconnect -> sync -> clear pending state.

**Doctor linking**:
Doctor login -> Add patient -> generate invite code -> patient login -> Link
Doctor -> enter code -> access row created -> doctor dashboard shows patient.

**Doctor export**:
Doctor dashboard -> select linked patient -> choose day/month -> choose export
mode -> generate JSON -> validate/access file.

## UX/UI Notes

- Design simple Figma wireframes before implementation.
- Avoid over-polish before the first working slice is validated.
- Main workflows must be readable with large controls and clear medical-style
  spacing.
- Use familiar controls: forms, segmented controls, toggles, date pickers,
  language/theme settings, photo preview, and clear pending/offline badges.
- Support Serbian and English from the start.
- Use light and dark theme tokens consistently across web and Android.
- Do not use in-app feature-explainer text as a substitute for usable workflows.

## Roles And Permissions

- **Patient**: create/read/update/delete own entries, own baseline, own photos,
  settings, consent; redeem doctor invite code.
- **Doctor**: read own profile, create/revoke own unused invite codes, read active
  linked patients, read linked patient entries/photos, create exports for linked
  patients.
- **Unauthenticated**: no app data access.
- **Admin/service**: manual doctor provisioning, repair operations, privileged
  backend functions. Service credentials stay server-side only.

## Data Model

Core entities:

- `user_profiles`: role, display name, language, voice language, theme, consent.
- `patient_baseline_profiles`: baseline demographic/health fields and weight
  reminder state.
- `patient_entries`: patient-owned timeline entries with type, title, notes,
  timestamp, custom fields, source client.
- `daily_form_details`, `meal_details`, `symptom_details`, `stool_details`,
  `medication_details`, `exercise_details`, `menstruation_events`: structured
  V1 form details.
- `entry_photos`: compressed photo and thumbnail metadata, private storage paths,
  dimensions, size, label.
- `doctor_invite_codes`: doctor-generated single-use code, status, expiry,
  usage counters.
- `doctor_patient_access`: doctor-patient link with active/revoked status.
- `export_requests`: export audit/metadata for doctor exports.
- `audit_events`: consent, invite, access, export, photo, sync, denied access.
- `local_pending_entries`: client-local offline-lite queue, not a server table.

See `specs/001-patient-research-tracking/data-model.md` for fields and rules.

## API / Contracts / Integration Notes

Required backend functions/RPC:

- `create_doctor_invite_code`
- `revoke_doctor_invite_code`
- `redeem_doctor_invite_code`
- `export_patient_data`

Storage contract:

- Private bucket for patient photos and thumbnails.
- Suggested path:
  `patients/{patient_id}/entries/{entry_id}/photos/{photo_id}.jpg`
  and `patients/{patient_id}/entries/{entry_id}/thumbs/{photo_id}.jpg`.
- Linked doctor image access should use authenticated access or time-limited
  signed references generated by guarded backend paths.

Export contract:

- Schema file: `specs/001-patient-research-tracking/contracts/export-json.schema.json`
- Day range: selected date 00:00 inclusive to next day 00:00 exclusive.
- Month range: month start to current date/time or month end, whichever is
  earlier.
- Images-only mode includes image references, metadata, timestamp, label, entry
  type; excludes long notes/symptom descriptions.

Reference contracts:

- `specs/001-patient-research-tracking/contracts/app-contracts.md`
- `specs/001-patient-research-tracking/contracts/supabase-contract.md`
- `specs/001-patient-research-tracking/contracts/export-json.schema.json`

## Technical Implementation Plan

Recommended stack:

- Web: React + TypeScript + Vite.
- Native: React Native + TypeScript, preferably Expo with development/prebuild
  support for native modules when needed.
- Backend: Supabase Auth, Postgres, Storage, RLS, Edge Functions/RPC.
- Shared packages: `contracts`, `forms`, `i18n`, `photo`, `sync`,
  `supabase-client`, `ui-tokens`.
- Testing: unit/component tests, integration tests, RLS/security tests, web e2e,
  Android APK smoke, Huawei APK smoke when available.

Recommended first implementation order:

1. Monorepo and Supabase foundation.
2. RLS and role tests.
3. Patient consent/login/timeline/text entry first slice.
4. Full forms.
5. Offline-lite.
6. Photos and voice.
7. Doctor linking/dashboard.
8. Doctor exports.
9. Language/theme settings and final validation.

## Programmer Task Breakdown

Full task list: `specs/001-patient-research-tracking/tasks.md`

Task summary:

- T001-T012: setup and workspace skeleton.
- T013-T032: foundational Supabase schema, RLS, shared contracts, guards, audit,
  fixtures, provisioning docs.
- T033-T044: US1 patient consent/login/basic timeline slice.
- T045-T059: US2 full baseline/daily/symptom/stool forms.
- T060-T072: US3 offline-lite text tracking.
- T073-T087: US4 photos and voice input.
- T088-T101: US5 doctor invite linking and linked timelines.
- T102-T113: US6 doctor JSON exports.
- T114-T124: US7 language, voice language, and theme settings.
- T125-T134: polish, Figma checklist, consent copy, storage notes, RLS/web/Android
  /Huawei/acceptance validation.

The task list has 134 sequential checklist tasks and passed format validation.

## Acceptance Criteria

V1 is accepted when:

- Patient can log in, accept consent, create timestamped text entry, reload, and
  see it on timeline in under 5 minutes during guided acceptance.
- Full baseline and daily medical/symptom forms save and reload without required
  field loss.
- Offline-lite pending text entry syncs once within 60 seconds after reconnect.
- Photo uploads are compressed JPEG <=1280px wide with thumbnail and no original
  full-resolution upload.
- Voice input works where supported and typing fallback works where unsupported.
- Doctor invite code links one patient, rejects reuse, and hides unlinked
  patients.
- Doctor exports day and current/partial month JSON in all three modes and no
  mode embeds base64 images.
- Role/RLS tests prove patients cannot access other patients and doctors cannot
  access unlinked patients or edit patient entries.
- Serbian/English UI and light/dark theme work in core patient and doctor flows.
- Web app, Android APK, and Huawei Android APK when available pass smoke tests.

## Testing Expectations

Minimum test suites:

- Form schema unit tests.
- Contract/schema tests for entries, photos, exports, and settings.
- Supabase RLS/security tests.
- Integration tests for patient first slice, full forms, offline-lite, photo
  upload, invite linking, exports, and language/theme.
- Web e2e tests for timeline, offline-lite, doctor dashboard, exports, settings.
- Mobile smoke/e2e tests for the same key flows.
- Manual or automated Android APK and Huawei Android validation.

Use `specs/001-patient-research-tracking/quickstart.md` as the acceptance
validation guide.

## Deployment / Setup Notes

- Implementers must choose current stable versions at development start.
- Supabase migrations, policies, functions, and storage config should be
  versioned under `apps/supabase/`.
- Doctor provisioning instructions must be documented before doctor testing.
- Environment templates must separate web, mobile, and Supabase variables.
- Never expose Supabase service-role credentials in client apps.
- Create private storage bucket and policies before photo workflow testing.
- Configure Android APK build pipeline and test on a standard Android device.
- Test Huawei Android if a Huawei device is available.
- Figma wireframes should be created before UI implementation, but should not
  block the first functional slice.

## Spec Kit Outputs

- Constitution: `.specify/memory/constitution.md`
- Spec: `specs/001-patient-research-tracking/spec.md`
- Requirements checklist: `specs/001-patient-research-tracking/checklists/requirements.md`
- Plan: `specs/001-patient-research-tracking/plan.md`
- Research: `specs/001-patient-research-tracking/research.md`
- Data model: `specs/001-patient-research-tracking/data-model.md`
- Contracts: `specs/001-patient-research-tracking/contracts/`
- Quickstart: `specs/001-patient-research-tracking/quickstart.md`
- Tasks: `specs/001-patient-research-tracking/tasks.md`

## Analysis Summary

- No unresolved `[NEEDS CLARIFICATION]` markers remain in the feature spec.
- Requirement checklist is fully checked.
- Constitution gates pass in the plan and post-design check.
- Task list contains 134 tasks, sequentially numbered T001-T134.
- No task-format violations found.
- Known tooling note: the optional Spec Kit agent-context hook skipped because
  the local Python environment lacks PyYAML, but `AGENTS.md` was updated manually
  to point to the active plan.

## Reference Sources

- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase private asset/signed URL behavior: https://supabase.com/docs/guides/storage/serving/downloads
- React Native TypeScript: https://reactnative.dev/docs/typescript
- Expo EAS Build: https://docs.expo.dev/build/introduction/
- Vite Guide: https://vite.dev/guide/

## Unresolved Questions

None blocking V1 planning. Future product decisions remain: patient-initiated
doctor access revocation UI, iOS release, post-research archive cleanup tooling,
doctor notes, formal compliance target, and any doctor-configurable form builder.
