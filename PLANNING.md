# PLANNING.md - V1 Patient Research Tracking App

Source of truth: `Specification/finals/FINAL_PROJECT_HANDOFF.md`.

## 1. Goal And Product Shape
- Build V1 as two apps: a web app and a native Android app connected to the same Supabase backend.
- Both apps must expose the same data, roles, forms, workflows, Serbian/English UI, voice language setting, and light/dark theme behavior.
- Purpose: a private 3-month patient research tracking pilot where patients record medical/lifestyle data and linked doctors review timelines/export selected data.
- Boundary: V1 is not a diagnosis tool and does not claim formal medical-device or compliance certification.

## 2. V1 Scope
Build:
- Patient signup/login and doctor login.
- Consent/privacy gate before app workflows.
- One immutable role per account: `patient` or `doctor`.
- Manual doctor provisioning in Supabase.
- Doctor invite-code creation, revocation before use, and patient redemption.
- Patient baseline profile, full daily/symptom/stool forms, timeline CRUD, timestamp editing, and custom entries.
- Offline-lite cached own history and pending patient text entries.
- Online compressed private photo upload with thumbnail and metadata for food/meal/fluid and medication entries only.
- Free browser/device voice input for text fields where supported.
- Doctor dashboard, active linked patient timeline read view, and doctor JSON exports.
- RLS/security tests, web validation, Android APK validation, and Huawei Android validation when a Huawei device is available.

Do not build in V1:
- Doctor notes, patient revocation UI, paid transcription, raw audio storage, full offline sync, multi-device conflict resolution, offline photo upload, automatic deletion, post-research cleanup, iOS release, or formal compliance certification.

## 3. Target Architecture
Recommended monorepo:
```text
apps/web
apps/mobile
apps/supabase
packages/contracts
packages/forms
packages/i18n
packages/photo
packages/sync
packages/supabase-client
packages/ui-tokens
```
- Web: React + TypeScript + Vite.
- Mobile: React Native + TypeScript, preferably Expo with prebuild support.
- Backend: Supabase Auth, Postgres, Storage, RLS, guarded RPC/Edge Functions.
- Supabase package layout: `apps/supabase` is the package root; the standard Supabase CLI project lives in `apps/supabase/supabase`, with migrations in `apps/supabase/supabase/migrations`, Edge Functions in `apps/supabase/supabase/functions`, and focused SQL/RLS tests in `apps/supabase/tests`.
- Supabase workflow commands are run from `apps/supabase`: `npm run migration:list`, `npm run db:push:dry`, `npm run rls:core`, and `npm run rls:photos`.
- Testing: unit/component, integration, RLS/security, web e2e, mobile smoke/e2e.

## 4. Non-Negotiable Build Rules
- Build the patient first slice before broad UI polish.
- Share contracts, form schemas, i18n, photo, sync, Supabase wrappers, and UI tokens across web and Android.
- Put all visible UI text behind translation keys; do not hardcode component strings.
- Never ship Supabase service-role keys in web or mobile clients.
- Enable and test RLS on every exposed app table.
- Never upload original full-resolution photos and never store base64 images in rows or exports.
- Keep UI clean, readable, medical-style, older-user friendly, mobile-first, and consistent in light/dark themes.
- Treat RLS, export, photo, and offline-lite behavior as high-risk release gates.

## 5. Roles And Permissions
- Patient: create/read/update/delete own entries, baseline, photos, settings, consent; redeem invite codes; view cached own history offline.
- Doctor: read own profile; create/revoke own unused invite codes; read active linked patients and their timelines/photos; create linked-patient exports; never edit/delete patient entries.
- Unauthenticated: no app data access.
- Admin/operator: manually provision doctors, configure Supabase/storage, run privileged repair work, and keep service credentials server-side.

## 6. Data Model
Server tables:
- `user_profiles`, `patient_baseline_profiles`, `patient_entries`, `daily_form_details`, `meal_details`, `symptom_details`, `stool_details`.
- `medication_details`, `exercise_details`, `menstruation_events`, `entry_photos`, `doctor_invite_codes`, `doctor_patient_access`.
- `export_requests`, `audit_events`.

Client-local only:
- `local_pending_entries`.

Data rules:
- Patient owns patient-created data.
- Doctor read access depends on active `doctor_patient_access`.
- Revoked access rows must be respected even without a patient revocation UI.
- No automatic deletion during the 3-month research period.

## 7. Backend Functions And Storage
Required guarded functions/RPC:
- `create_doctor_invite_code`
- `revoke_doctor_invite_code`
- `redeem_doctor_invite_code`
- `export_patient_data`

Backend behavior:
- Invite codes are short, single-use, revocable before use, expire after 7 days, and create active access when redeemed.
- Exports only work for active linked doctors.
- Export ranges are selected day or selected/current partial month.
- Export modes: all data, all data with images, images only with labels.
- Export JSON must never embed base64 images.

Photo storage:
- Private Supabase bucket for photos and thumbnails.
- Paths: `patients/{patient_id}/entries/{entry_id}/photos/{photo_id}.jpg` and `patients/{patient_id}/entries/{entry_id}/thumbs/{photo_id}.jpg`.
- V1 photo inputs are intentionally limited to food and medication workflows:
  - Each meal inside the food form can have its own photo.
  - Each other-fluid input inside the food form can have its own photo.
  - Medication entries can have a photo for package/pill identification.
- Do not add photo inputs to daily, symptom, stool, exercise, menstruation, note, or custom-note entries in V1.
- Preview, resize main image to max width 1280px, encode JPEG around quality `0.8`, create thumbnail, and store metadata/path rows only.
- Target sizes: main 250-500 KB where possible; thumbnail 20-60 KB.
- Linked doctor access must use authenticated access or guarded time-limited references.
- Add storage budget warnings before photo workflow testing.

## 8. Shared Package Responsibilities
- `contracts`: shared TypeScript types and JSON export validation.
- `forms`: baseline, daily, meal, symptom, stool, medication, exercise, menstruation schemas, validation, defaults.
- `i18n`: Serbian/English dictionaries, app language persistence, voice language setting.
- `photo`: preview, resize, JPEG compression, thumbnail creation, metadata helpers.
- `sync`: offline-lite queue, pending markers, reconnect sync helpers.
- `supabase-client`: browser/mobile-safe clients, typed query helpers, RPC wrappers, role/access guards.
- `ui-tokens`: light/dark colors, spacing, typography, and control sizing.

## 9. Implementation Phases
### Phase 0 - Product And UI Prep
- Confirm V1 workflows/non-goals and create simple Figma wireframes for consent, login, timeline, forms, doctor dashboard, exports, and settings.
- Done: core screens/navigation are clear enough to implement; Figma does not block the first functional slice.

### Phase 1 - Monorepo Foundation
- Create workspace structure, TypeScript config, linting, formatting, test runners, env templates, web shell, mobile shell, Supabase folder, and shared package skeletons.
- Done: web/mobile boot and import shared packages; env vars are separated for web, mobile, and Supabase.

### Phase 2 - Supabase Foundation And RLS
- Add migrations for core tables, immutable role behavior, RLS policies, audit events, fixtures, and manual doctor provisioning docs.
- Done: tests prove patients cannot access other patients, doctors cannot access unlinked patients, and doctors cannot edit/delete patient entries.

### Phase 3 - Patient First Slice
- Implement patient signup/login, doctor login, consent gate, recent-day timeline, timestamped text entry creation, timestamp edit, save, reload, and success/failure states.
- Done: guided acceptance can log in, consent, create a text entry, reload, and see it; online text save responds in under 2 seconds.

### Phase 4 - Full Patient Forms
- Progress checkpoint (user/Codex-verified 2026-07-03): Web and Android/mobile Phase 4 form functionality was compared by the user and reported equivalent. Codex verified both clients use shared `@project4/supabase-client` form persistence paths, live Supabase metadata shows RLS enabled on Phase 4 tables with no anon DML/truncate access, Phase 4 write RPCs are `security invoker` with execute denied to anon and granted to authenticated, and local `npm test`/`npm run typecheck` passed. A grant-hardening migration removed excess authenticated table privileges such as `TRUNCATE`.
- Progress checkpoint (user-verified 2026-06-22): The Android button-based patient home and exercise add-another/return-home flow were visually and interactively reviewed in an Android Studio Pixel 9 emulator and reported good.
- Progress checkpoint (Codex-verified 2026-06-21): Daily completion is enforced in Supabase. Drafts remain saveable, final completion requires all applicable Daily fields, and a same-day Exercise entry is required only when physical activity is marked yes. Owner/other-patient/doctor/anonymous SQL coverage passed against the live project.
- Progress checkpoint (user-verified 2026-06-19): stool and medication entry workflows are complete across shared contracts/validation, Supabase constraints and RLS, Android/mobile, and companion web. Browser smoke testing for create, save, reload, and timeline visibility passed multiple times. Visual polish and structured-detail editing are intentionally deferred.
- Implement baseline: sex, birth year, occupation, chronic diseases, chronic therapy, menstrual history where relevant, weight, height, recent major weight change, and 3-month weight reminder.
- Show menstrual history and menstruation tracking only when the patient's recorded sex is female; do not show menstruation fields or tracking to male patients.
- Implement daily fields: wake time, food, appetite, water, other fluids, activity, sleep, stress, day description, medication outside chronic therapy, menstruation, energy, naps, and notes.
- Require a response for every applicable daily field on each tracked day. Subfields explicitly marked optional remain optional, and conditional details are required only when their triggering answer applies.
- Implement entry details: meal, symptom, stool, medication, exercise, menstruation, note, and custom fields.
- Implement symptom fields: intake list, start/end time, intensity 1-3, quality-of-life effect, modifying factors, sleep interruption, pain location/radiation/description, custom description.
- Implement stool fields: Bristol classification, urgency, pain, mucus, blood, fatty stool, black stool.
- Repair Phase 4 form presentation with distinct platform styling: native mobile layouts must follow phone-first React Native patterns, while the companion web app must use its own responsive web layout without inheriting phone-frame or desktop-width assumptions.
- Validate Phase 4 form layout at Pixel 9-style dimensions, at least one smaller phone viewport, and one wider desktop viewport. Stack or reflow date/time and other multi-column controls before they clip, overflow, or become unreadable.
- Done: baseline and daily medical/symptom forms save and reload without required field loss; form schema unit tests pass; mobile and web form layouts pass their required viewport review without horizontal clipping or overflow.

### Phase 5 - Offline-Lite
- Progress checkpoint (user/Codex-verified 2026-07-04): Phase 5 offline-lite is complete. Android/mobile and companion web smoke tests were user-verified: offline mode auto-detects quickly when connectivity drops, online-only actions are visibly disabled, Notes remains usable, cached timeline viewing works, the red cached-entry notice no longer flickers, pending note creation/editing displays a pending-sync marker, and reconnect sync clears pending state. Codex verified live Supabase note sync for Android and web smoke tests, confirmed no duplicate note rows were created, applied a note-save audit migration, and verified every note create/update now writes a timestamped `audit_events` row preserving previous/new text and timestamps. Local `npm run typecheck`, `npm test`, and `npm run build:web` passed.
- Progress checkpoint (Codex-verified 2026-07-03): First Android/mobile and companion web offline-lite slice added. Recent patient timeline entries and opened timeline days are cached locally after successful loads and reused when loading fails, new note/text saves fall back to a local pending queue when online save fails, note/text timestamp edits fall back to a local pending queue when online save fails, pending items appear in recent/timeline lists with a pending-sync marker, and pending items retry on refresh/app resume/focus. Offline smoke testing remains pending.
- Cache own recent history/opened days, allow pending offline text entries, allow pending timestamp edits, show pending markers, sync on reconnect, and clear pending state.
- Exclude offline photo upload, fresh exports, fresh doctor/patient fetches, and complex conflict handling.
- Done: cached days open offline and pending text syncs within 60 seconds after connectivity returns.

### Phase 6 - Photos And Voice
- Add photo preview, compression, thumbnail generation, private upload, metadata rows, ownership policies, and linked-doctor read access for the V1 photo surfaces only: meals, other fluids, and medication.
- Exclude photo inputs for daily, symptom, stool, exercise, menstruation, note, and custom-note entries. Rationale: daily has no photo need; symptoms are subjective stomach symptoms; stool photos are intentionally not collected; exercise, menstruation, and notes do not need photos in V1.
- Add free device/browser voice helper for `sr-RS` and `en-US` where available; append transcript, allow edits before save, and fall back to typing.
- Done: photos are private compressed JPEG <=1280px wide with thumbnails and no original upload; voice/fallback behavior works.

### Phase 7 - Doctor Linking And Dashboard
- Progress checkpoint (user/Codex-verified 2026-07-08): Phase 7 is complete for the shared product slice. The web workflow was user-verified: doctor creates an invite code, patient redeems it, the doctor panel marks the code used, and the linked patient appears with a read-only timeline. Codex verified the live Supabase project has one clean redeemed invite mapped to one active doctor-patient access row with no duplicate codes or duplicate active access pairs. Local `npm test` and `npm run typecheck` passed. Live Supabase `npm run rls:core`, `npm run rls:invites`, and `npm run rls:photos` passed. Android/mobile Phase 7 device visual smoke remains deferred to final mobile validation.
- Implement doctor dashboard, invite creation, unused invite revoke, patient redemption, active linked patient list, linked patient timeline, and read-only doctor views.
- Done: one code links one patient, reuse is rejected, revoked/expired codes fail, and unlinked patients stay hidden.

### Phase 8 - Doctor Exports
- Implement selected-day and selected/current partial-month exports in all three modes with audit/metadata and JSON schema validation.
- Done: linked doctors export allowed data in all modes; unlinked doctors fail; expected pilot exports finish in under 30 seconds; no base64 images.

### Phase 9 - Settings, Localization, Theme
- Add app language, voice language, and theme settings; apply dictionaries and tokens across web and Android.
- Done: core patient/doctor flows work in Serbian/English and light/dark, with no hardcoded core UI strings.

### Phase 10 - Final Validation
- Run automated tests, web e2e, Android APK smoke, Huawei smoke when available, storage/photo checks, consent/privacy/non-diagnosis review, and storage warning review.
- Done: all V1 acceptance criteria pass.

## 10. Minimum Test Plan
- Form schema unit tests.
- Contract/schema tests for entries, photos, exports, and settings.
- Supabase RLS/security tests.
- Integration tests for patient first slice, full forms, offline-lite, photo upload, invite linking, exports, and language/theme.
- Web e2e for timeline, offline-lite, doctor dashboard, exports, and settings.
- Mobile smoke/e2e for matching key flows.
- Android APK smoke test.
- Huawei Android smoke test when available.

## 11. V1 Acceptance Criteria
- Patient can log in, accept consent, create timestamped text entry, reload, and see it on the timeline.
- Full baseline and daily medical/symptom forms save and reload without required field loss.
- Offline-lite pending text entry syncs once within 60 seconds after reconnect.
- Photo uploads are compressed JPEG, max 1280px wide, thumbnailed, private, and not original full-resolution uploads.
- Voice input works where supported and typing fallback works elsewhere.
- Doctor invite code links one patient, rejects reuse, and hides unlinked patients.
- Doctor exports day and current/partial month JSON in all three modes.
- No export embeds base64 images.
- RLS proves patients cannot access other patients and doctors cannot access or edit unauthorized patient data.
- Serbian/English UI and light/dark theme work in core flows.
- Web app, Android APK, and Huawei Android when available pass smoke tests.

## 12. Main Risks
- RLS gaps exposing patient data.
- Web/mobile form divergence.
- Offline queue duplicates.
- Oversized photo uploads.
- Browser/device voice support differences.
- Export JSON leaking image data as base64.
- Hardcoded strings blocking localization.
- Manual doctor provisioning mistakes.
