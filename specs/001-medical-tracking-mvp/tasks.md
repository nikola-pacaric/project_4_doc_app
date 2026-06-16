# Tasks: Medical Tracking Research MVP

**Input**: Design documents from `specs/001-medical-tracking-mvp/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api-contract.md](contracts/api-contract.md)

**Tests**: Required for RLS, storage policy, offline sync, invite-code redemption, exports, and cross-platform smoke checks.

**Organization**: Tasks are grouped by user story so each story can be independently implemented and validated by programmers.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish app, backend, design, and test foundations.

- [ ] T001 Record final stack choice and platform rationale in `docs/architecture/stack-decision.md`
- [ ] T002 Create application workspace structure in `app/` per `specs/001-medical-tracking-mvp/plan.md`
- [ ] T003 Create Supabase workspace structure in `supabase/` for migrations, policies, and storage configuration
- [ ] T004 [P] Create initial design wireframes for patient timeline, doctor dashboard, invite linking, entry form, settings, and consent in `docs/design/figma-wireframes.md`
- [ ] T005 [P] Define environment variable inventory and secret handling rules in `docs/architecture/environment.md`
- [ ] T006 [P] Create cross-platform test matrix in `docs/architecture/test-matrix.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schema, security, localization, and offline foundations required by all stories.

- [ ] T007 Create base Supabase schema migration for `profiles`, `user_settings`, and `consent_acceptances` in `supabase/migrations/`
- [ ] T008 Create research data schema migration for `patient_entries`, `entry_photos`, `doctor_notes`, `user_content_visibility_states`, `export_audit_events`, and `storage_usage_estimates` in `supabase/migrations/`
- [ ] T009 Create doctor linking schema migration for `doctor_invite_codes` and `doctor_patient_access` in `supabase/migrations/`
- [ ] T010 Create private storage bucket configuration for compressed photos and thumbnails in `supabase/storage/`
- [ ] T011 Write RLS policies for profiles, settings, consent, entries, photos, notes, invite codes, access rows, visibility states, exports, and storage in `supabase/policies/`
- [ ] T012 [P] Add localization resource structure for Serbian and English in `app/src/i18n/`
- [ ] T013 [P] Add theme token structure for light and dark modes in `app/src/theme/`
- [ ] T014 [P] Add offline local queue design and idempotency helpers in `app/src/offline/`
- [ ] T015 [P] Add reusable auth/session boundary design in `app/src/auth/`
- [ ] T016 Write RLS and storage policy tests in `app/tests/integration/rls-storage-access.test.*`
- [ ] T017 Write database retention tests for no hard delete and tracked visibility states in `app/tests/integration/research-retention.test.*`

**Checkpoint**: No user story work should proceed until schema, RLS, storage, i18n, theme, and offline foundations are ready.

---

## Phase 3: User Story 1 - Role-Based Access and Consent (Priority: P1)

**Goal**: Users authenticate, have one role, accept consent, and enter the correct role experience.

**Independent Test**: Patient and doctor accounts accept consent, land in correct UI, and cannot access the other role.

- [ ] T018 [P] [US1] Implement trusted profile loading in `app/src/auth/profile-service.*`
- [ ] T019 [P] [US1] Implement consent screen and consent acceptance flow in `app/src/auth/consent-screen.*`
- [ ] T020 [US1] Implement role-based route/navigation guard in `app/src/auth/role-guard.*`
- [ ] T021 [US1] Implement patient shell and doctor shell entry points in `app/src/auth/role-entry.*`
- [ ] T022 [US1] Add consent copy keys for Serbian and English in `app/src/i18n/`
- [ ] T023 [US1] Write role and consent tests in `app/tests/e2e/role-consent.test.*`

**Checkpoint**: Role and consent flows are independently demoable.

---

## Phase 4: User Story 2 - Patient Timeline With Online and Offline-Lite Entries (Priority: P1)

**Goal**: Patients create and view entries online and create pending text entries offline.

**Independent Test**: Online entry persists, offline pending entry is visible, timestamp edit persists, and sync creates one server row.

- [ ] T024 [P] [US2] Implement entry type definitions and predefined field metadata in `app/src/entries/entry-types.*`
- [ ] T025 [P] [US2] Implement patient timeline view with cached history support in `app/src/entries/patient-timeline.*`
- [ ] T026 [US2] Implement entry creation form with custom fields in `app/src/entries/entry-form.*`
- [ ] T027 [US2] Implement local pending entry queue and pending-sync UI in `app/src/offline/pending-entry-queue.*`
- [ ] T028 [US2] Implement idempotent sync using `client_entry_uuid` in `app/src/offline/sync-service.*`
- [ ] T029 [US2] Implement timestamp editing for pending and synced entries in `app/src/entries/timestamp-editor.*`
- [ ] T030 [US2] Write offline-lite sync tests in `app/tests/e2e/offline-entry-sync.test.*`

**Checkpoint**: Patient entry foundation works online and offline-lite.

---

## Phase 5: User Story 3 - Invite-Code Doctor Linking (Priority: P1)

**Goal**: Doctors create invite codes and patients redeem valid codes into active access rows.

**Independent Test**: Valid code links doctor/patient, reused/revoked/expired codes fail, and unrelated doctor remains denied.

- [ ] T031 [P] [US3] Implement doctor invite-code creation UI in `app/src/linking/create-invite-code.*`
- [ ] T032 [P] [US3] Implement patient Link Doctor screen in `app/src/linking/link-doctor-screen.*`
- [ ] T033 [US3] Implement atomic invite-code redemption service in `app/src/linking/redeem-invite-code.*`
- [ ] T034 [US3] Implement doctor dashboard patient list based on active access in `app/src/linking/linked-patients-service.*`
- [ ] T035 [US3] Implement patient doctor-access revoke action in `app/src/linking/revoke-doctor-access.*`
- [ ] T036 [US3] Write invite-code lifecycle tests in `app/tests/e2e/invite-code-linking.test.*`

**Checkpoint**: Doctor-patient access can be created and enforced without manual database linking.

---

## Phase 6: User Story 4 - Online Photo Attachments With Storage Protection (Priority: P2)

**Goal**: Patients upload compressed photos and thumbnails online without original uploads or base64 database storage.

**Independent Test**: A large image is compressed, thumbnail generated, private storage paths saved, and offline photo upload is blocked.

- [ ] T037 [P] [US4] Implement photo selection/take and preview UI in `app/src/photos/photo-picker.*`
- [ ] T038 [P] [US4] Implement client-side resize/compress/thumbnail processing in `app/src/photos/photo-processor.*`
- [ ] T039 [US4] Implement private storage upload and metadata creation in `app/src/photos/photo-upload-service.*`
- [ ] T040 [US4] Implement attach-photo-to-old-entry flow in `app/src/photos/attach-photo-flow.*`
- [ ] T041 [US4] Implement storage usage warning and per-file rejection UI in `app/src/storage/storage-budget.*`
- [ ] T042 [US4] Write photo compression and storage tests in `app/tests/e2e/photo-upload.test.*`

**Checkpoint**: Photo upload is storage-safe and online-only.

---

## Phase 7: User Story 5 - Doctor Dashboard and Research Exports (Priority: P2)

**Goal**: Doctors review active linked patient data and export selected day/month JSON in all required modes.

**Independent Test**: Linked doctor exports valid JSON; unlinked doctor cannot view or export.

- [ ] T043 [P] [US5] Implement linked patient timeline read view in `app/src/entries/doctor-patient-timeline.*`
- [ ] T044 [P] [US5] Implement doctor notes separate from patient entries in `app/src/entries/doctor-notes.*`
- [ ] T045 [US5] Implement export range calculation for selected day and selected month in `app/src/exports/export-ranges.*`
- [ ] T046 [US5] Implement All Data export mode in `app/src/exports/all-data-export.*`
- [ ] T047 [US5] Implement All Data With Images export mode with signed URLs in `app/src/exports/all-data-images-export.*`
- [ ] T048 [US5] Implement Images Only With Labels export mode in `app/src/exports/images-only-export.*`
- [ ] T049 [US5] Write export contract tests in `app/tests/integration/export-contract.test.*`

**Checkpoint**: Doctor research review and export are usable for active linked patients.

---

## Phase 8: User Story 6 - Voice, Language, and Theme Preferences (Priority: P2)

**Goal**: Users can switch UI language/theme and use free voice input with typing fallback.

**Independent Test**: Serbian/English UI switch works, voice transcript appends where supported, fallback typing works where unsupported, and theme switch remains readable.

- [ ] T050 [P] [US6] Implement settings screen for app language, voice language, and theme in `app/src/settings/settings-screen.*`
- [ ] T051 [P] [US6] Implement reusable voice text input helper in `app/src/voice/voice-text-input.*`
- [ ] T052 [US6] Implement Serbian and English translation coverage checks in `app/src/i18n/translation-checks.*`
- [ ] T053 [US6] Implement light/dark theme switching in `app/src/theme/theme-provider.*`
- [ ] T054 [US6] Write language, voice fallback, and theme tests in `app/tests/e2e/language-voice-theme.test.*`

**Checkpoint**: Accessibility-oriented language, voice, and theme preferences are verified.

---

## Phase 9: User Story 7 - Local Hide/Delete Without Research Deletion (Priority: P2)

**Goal**: Users hide or locally delete retained research content while the database tracks both research and local states.

**Independent Test**: Hide/local delete removes from default UI, preserves rows/storage, records state, and appears in export metadata.

- [ ] T055 [P] [US7] Implement visibility state service in `app/src/entries/content-visibility-service.*`
- [ ] T056 [US7] Implement hide entry/photo UI in `app/src/entries/hide-content-action.*`
- [ ] T057 [US7] Implement locally delete entry/photo UI in `app/src/entries/local-delete-action.*`
- [ ] T058 [US7] Integrate visibility state filtering into patient timeline in `app/src/entries/patient-timeline.*`
- [ ] T059 [US7] Integrate visibility state metadata into export modes in `app/src/exports/`
- [ ] T060 [US7] Write no-hard-delete visibility tests in `app/tests/e2e/local-delete-retention.test.*`

**Checkpoint**: Local delete/hide behavior satisfies research retention.

---

## Final Phase: Polish and Release Checks

- [ ] T061 Run full quickstart validation from `specs/001-medical-tracking-mvp/quickstart.md`
- [ ] T062 Run Android APK smoke test and record results in `docs/architecture/test-matrix.md`
- [ ] T063 Run Huawei Android APK smoke test and record results in `docs/architecture/test-matrix.md`
- [ ] T064 Run Chromium web smoke test and record results in `docs/architecture/test-matrix.md`
- [ ] T065 Verify no service-role or secret key is exposed in public clients in `docs/architecture/security-review.md`
- [ ] T066 Verify Supabase RLS/storage policies against current Supabase docs in `docs/architecture/security-review.md`
- [ ] T067 Verify Figma wireframes match implemented core flows in `docs/design/figma-wireframes.md`
- [ ] T068 Prepare V1 release acceptance checklist in `docs/architecture/release-checklist.md`

## Dependencies and Execution Order

- Phase 1 setup can start immediately.
- Phase 2 foundational work blocks all user stories.
- US1, US2, and US3 are the critical P1 MVP foundation and should be completed before P2 stories.
- US4, US5, US6, and US7 can proceed after foundational work, but US7 must be integrated before any destructive-looking user action ships.
- Final release checks require all selected MVP stories complete.

## Parallel Opportunities

- T004, T005, and T006 can run in parallel.
- T012, T013, T014, and T015 can run in parallel after schema direction is agreed.
- UI tasks within different user stories can run in parallel after Phase 2.
- Contract/policy tests can run in parallel with UI implementation once contracts are stable.

## Implementation Strategy

1. Complete setup and foundational schema/RLS/storage/i18n/offline scaffolding.
2. Deliver P1 slice: consent/role access, patient online/offline-lite text entries, invite-code linking.
3. Add P2 slice: photos, doctor dashboard/export, language/voice/theme, local hide/delete retention behavior.
4. Run quickstart validation and cross-platform smoke checks before V1 acceptance.
