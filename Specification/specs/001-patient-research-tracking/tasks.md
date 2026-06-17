# Tasks: V1 Patient Research Tracking App

**Input**: Design documents from `specs/001-patient-research-tracking/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Test tasks are included because the constitution requires role/RLS,
offline-lite, photo, export, web, Android, and Huawei validation before V1 is
accepted.

**Organization**: Tasks are grouped by user story to enable independent
implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the project structure, tooling, and shared package skeletons.

- [ ] T001 Create monorepo workspace configuration in `package.json` and `pnpm-workspace.yaml`
- [ ] T002 Create web app project skeleton in `apps/web/`
- [ ] T003 Create native Android app project skeleton in `apps/mobile/`
- [ ] T004 Create Supabase project skeleton in `apps/supabase/`
- [ ] T005 [P] Create shared contracts package skeleton in `packages/contracts/`
- [ ] T006 [P] Create shared forms package skeleton in `packages/forms/`
- [ ] T007 [P] Create shared i18n package skeleton in `packages/i18n/`
- [ ] T008 [P] Create shared photo package skeleton in `packages/photo/`
- [ ] T009 [P] Create shared sync package skeleton in `packages/sync/`
- [ ] T010 [P] Create shared UI token package skeleton in `packages/ui-tokens/`
- [ ] T011 Configure shared TypeScript, lint, format, and test commands in `package.json`, `tsconfig.base.json`, and repo config files
- [ ] T012 Create environment templates for web, mobile, and Supabase in `.env.example`, `apps/web/.env.example`, and `apps/mobile/.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data, security, settings, audit, shared contracts, and navigation
guards that all user stories depend on.

**Critical**: No user story work can begin until this phase is complete.

- [ ] T013 Create Supabase enum and base table migration in `apps/supabase/migrations/001_initial_schema.sql`
- [ ] T014 Create patient entry detail table migration in `apps/supabase/migrations/002_entry_details.sql`
- [ ] T015 Create doctor invite/access/export/audit migration in `apps/supabase/migrations/003_doctor_exports_audit.sql`
- [ ] T016 Create private photo storage bucket migration/config in `apps/supabase/migrations/004_private_photo_storage.sql`
- [ ] T017 Create RLS policy migration for patient-owned data in `apps/supabase/policies/001_patient_policies.sql`
- [ ] T018 Create RLS policy migration for doctor linked-patient access in `apps/supabase/policies/002_doctor_policies.sql`
- [ ] T019 Create storage object access policies in `apps/supabase/policies/003_storage_policies.sql`
- [ ] T020 Create auth profile provisioning rules for patient signup and admin-created doctors in `apps/supabase/migrations/005_profile_provisioning.sql`
- [ ] T021 [P] Define shared entity and export schemas in `packages/contracts/src/index.ts`
- [ ] T022 [P] Define shared app routes/screen contracts in `packages/contracts/src/appRoutes.ts`
- [ ] T023 [P] Define shared form schema primitives in `packages/forms/src/schema.ts`
- [ ] T024 [P] Define Serbian and English translation key structure in `packages/i18n/src/index.ts`
- [ ] T025 [P] Define shared theme tokens in `packages/ui-tokens/src/index.ts`
- [ ] T026 [P] Create Supabase client wrappers for web and mobile in `packages/supabase-client/src/index.ts`
- [ ] T027 Create consent/session/role route guards for web in `apps/web/src/app/guards.tsx`
- [ ] T028 Create consent/session/role navigation guards for mobile in `apps/mobile/src/app/guards.tsx`
- [ ] T029 Create audit event write helper in `packages/contracts/src/audit.ts`
- [ ] T030 Create reusable test fixtures for patient, doctor, linked access, and bad data in `tests/fixtures/users.ts`
- [ ] T031 Create RLS/security test harness in `tests/security/rls.test.ts`
- [ ] T032 Document manual doctor account provisioning in `docs/development/doctor-provisioning.md`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Patient consent, login, and basic timeline entry (Priority: P1)

**Goal**: Patient accepts consent, logs in, creates a timestamped text entry, saves
it, and sees it on the daily timeline.

**Independent Test**: Create one patient account, accept consent, create a text
entry, edit timestamp, save, reload, and verify timeline readback.

### Tests for User Story 1

- [ ] T033 [P] [US1] Create patient auth/consent integration test in `tests/integration/patient_consent_login.test.ts`
- [ ] T034 [P] [US1] Create patient text entry persistence test in `tests/integration/patient_text_entry.test.ts`
- [ ] T035 [P] [US1] Create web timeline e2e test in `apps/web/tests/e2e/patient_timeline.spec.ts`
- [ ] T036 [P] [US1] Create mobile timeline smoke test in `apps/mobile/tests/e2e/patient_timeline.spec.ts`

### Implementation for User Story 1

- [ ] T037 [US1] Implement consent acceptance contract in `packages/contracts/src/consent.ts`
- [ ] T038 [US1] Implement web login/signup/consent screens in `apps/web/src/features/auth/`
- [ ] T039 [US1] Implement mobile login/signup/consent screens in `apps/mobile/src/features/auth/`
- [ ] T040 [US1] Implement patient entry create/read/update/delete service in `packages/contracts/src/patientEntries.ts`
- [ ] T041 [US1] Implement web patient timeline screen in `apps/web/src/features/timeline/`
- [ ] T042 [US1] Implement mobile patient timeline screen in `apps/mobile/src/features/timeline/`
- [ ] T043 [US1] Implement timestamp editing in shared entry editor logic in `packages/forms/src/entryEditor.ts`
- [ ] T044 [US1] Integrate audit event recording for consent and entry save in `packages/contracts/src/audit.ts`

**Checkpoint**: First working slice is functional on web and mobile.

---

## Phase 4: User Story 2 - Full baseline and daily medical forms (Priority: P1)

**Goal**: Patient completes baseline profile and full daily/symptom/stool/related
forms required by the intake.

**Independent Test**: Complete baseline and one full daily form with meal,
symptom, stool, medication, exercise, daily note, and custom field, then reload.

### Tests for User Story 2

- [ ] T045 [P] [US2] Create baseline profile validation tests in `packages/forms/src/baselineProfile.test.ts`
- [ ] T046 [P] [US2] Create daily form validation tests in `packages/forms/src/dailyForm.test.ts`
- [ ] T047 [P] [US2] Create symptom and stool validation tests in `packages/forms/src/symptomStool.test.ts`
- [ ] T048 [P] [US2] Create full form persistence integration test in `tests/integration/full_forms.test.ts`

### Implementation for User Story 2

- [ ] T049 [P] [US2] Implement baseline profile schema in `packages/forms/src/baselineProfile.ts`
- [ ] T050 [P] [US2] Implement daily form schema in `packages/forms/src/dailyForm.ts`
- [ ] T051 [P] [US2] Implement symptom form schema in `packages/forms/src/symptomForm.ts`
- [ ] T052 [P] [US2] Implement stool form schema and Bristol guidance metadata in `packages/forms/src/stoolForm.ts`
- [ ] T053 [P] [US2] Implement meal, medication, exercise, daily note, and custom schemas in `packages/forms/src/entryTypes.ts`
- [ ] T054 [US2] Implement shared form rendering adapters in `packages/forms/src/rendering.ts`
- [ ] T055 [US2] Implement web baseline and daily form screens in `apps/web/src/features/forms/`
- [ ] T056 [US2] Implement mobile baseline and daily form screens in `apps/mobile/src/features/forms/`
- [ ] T057 [US2] Implement custom field add/display behavior in `packages/forms/src/customFields.ts`
- [ ] T058 [US2] Implement three-month weight reminder behavior in `packages/forms/src/weightReminder.ts`
- [ ] T059 [US2] Connect form detail saves to timeline entries in `packages/contracts/src/formEntries.ts`

**Checkpoint**: Full V1 patient form data saves and reloads on both apps.

---

## Phase 5: User Story 3 - Offline-lite patient text tracking (Priority: P2)

**Goal**: Patient can view cached own history, create pending text entries
offline, edit timestamps, and sync when online returns.

**Independent Test**: Open a cached day, go offline, create/edit pending text
entry, reconnect, and verify one synced server entry with no duplicate.

### Tests for User Story 3

- [ ] T060 [P] [US3] Create shared pending queue unit tests in `packages/sync/src/pendingQueue.test.ts`
- [ ] T061 [P] [US3] Create offline sync integration test in `tests/integration/offline_lite_sync.test.ts`
- [ ] T062 [P] [US3] Create web offline e2e test in `apps/web/tests/e2e/offline_lite.spec.ts`
- [ ] T063 [P] [US3] Create mobile offline smoke test in `apps/mobile/tests/e2e/offline_lite.spec.ts`

### Implementation for User Story 3

- [ ] T064 [P] [US3] Implement shared pending entry queue contract in `packages/sync/src/pendingQueue.ts`
- [ ] T065 [P] [US3] Implement shared cached day contract in `packages/sync/src/cachedDays.ts`
- [ ] T066 [US3] Implement web local persistence adapter in `apps/web/src/features/offline/localStore.ts`
- [ ] T067 [US3] Implement mobile local persistence adapter in `apps/mobile/src/features/offline/localStore.ts`
- [ ] T068 [US3] Implement shared sync orchestration in `packages/sync/src/syncEngine.ts`
- [ ] T069 [US3] Add pending/offline UI state to web timeline in `apps/web/src/features/timeline/`
- [ ] T070 [US3] Add pending/offline UI state to mobile timeline in `apps/mobile/src/features/timeline/`
- [ ] T071 [US3] Add duplicate prevention/idempotency metadata to entry save path in `packages/contracts/src/patientEntries.ts`
- [ ] T072 [US3] Block unsupported offline actions with localized messages in `packages/sync/src/offlineRules.ts`

**Checkpoint**: Offline-lite text tracking works without photo/export/offline doctor scope creep.

---

## Phase 6: User Story 4 - Online photos and free voice input (Priority: P2)

**Goal**: Patient attaches compressed private photos online and uses editable free
voice input across text fields where supported.

**Independent Test**: Attach a large photo to an entry and verify compression,
thumbnail, metadata, private path, no original upload, and voice fallback.

### Tests for User Story 4

- [ ] T073 [P] [US4] Create photo compression tests in `packages/photo/src/compress.test.ts`
- [ ] T074 [P] [US4] Create photo metadata/upload integration test in `tests/integration/photo_upload.test.ts`
- [ ] T075 [P] [US4] Create voice helper tests in `packages/forms/src/voiceInput.test.ts`
- [ ] T076 [P] [US4] Create offline photo rejection test in `tests/integration/offline_photo_block.test.ts`

### Implementation for User Story 4

- [ ] T077 [P] [US4] Implement shared photo compression rules in `packages/photo/src/compress.ts`
- [ ] T078 [P] [US4] Implement thumbnail generation rules in `packages/photo/src/thumbnail.ts`
- [ ] T079 [US4] Implement private photo upload service in `packages/photo/src/upload.ts`
- [ ] T080 [US4] Implement entry photo metadata contract in `packages/contracts/src/entryPhotos.ts`
- [ ] T081 [US4] Implement web photo picker/preview integration in `apps/web/src/features/photos/`
- [ ] T082 [US4] Implement mobile photo picker/preview integration in `apps/mobile/src/features/photos/`
- [ ] T083 [US4] Implement storage usage warning behavior in `packages/photo/src/storageBudget.ts`
- [ ] T084 [US4] Implement shared voice input adapter interface in `packages/forms/src/voiceInput.ts`
- [ ] T085 [US4] Implement web speech recognition adapter in `apps/web/src/features/voice/`
- [ ] T086 [US4] Implement mobile speech recognition adapter or fallback in `apps/mobile/src/features/voice/`
- [ ] T087 [US4] Add voice helper integration to all text-capable form fields in `packages/forms/src/rendering.ts`

**Checkpoint**: Photos and voice work online where supported with safe fallback behavior.

---

## Phase 7: User Story 5 - Doctor invite linking and linked timelines (Priority: P2)

**Goal**: Manually provisioned doctor creates a single-use invite code, patient
links using it, and doctor sees only linked active patient timelines.

**Independent Test**: Generate code, link one patient, verify linked dashboard,
reject reuse, and deny unlinked patient access.

### Tests for User Story 5

- [ ] T088 [P] [US5] Create invite-code function tests in `tests/integration/doctor_invites.test.ts`
- [ ] T089 [P] [US5] Create doctor linked-patient RLS tests in `tests/security/doctor_access.test.ts`
- [ ] T090 [P] [US5] Create web doctor dashboard e2e test in `apps/web/tests/e2e/doctor_dashboard.spec.ts`
- [ ] T091 [P] [US5] Create mobile doctor dashboard smoke test in `apps/mobile/tests/e2e/doctor_dashboard.spec.ts`

### Implementation for User Story 5

- [ ] T092 [US5] Implement `create_doctor_invite_code` backend function in `apps/supabase/functions/create_doctor_invite_code/`
- [ ] T093 [US5] Implement `revoke_doctor_invite_code` backend function in `apps/supabase/functions/revoke_doctor_invite_code/`
- [ ] T094 [US5] Implement `redeem_doctor_invite_code` atomic backend function in `apps/supabase/functions/redeem_doctor_invite_code/`
- [ ] T095 [US5] Implement shared doctor invite client contract in `packages/contracts/src/doctorInvites.ts`
- [ ] T096 [US5] Implement web Add Patient and Link Doctor screens in `apps/web/src/features/doctorLinking/`
- [ ] T097 [US5] Implement mobile Add Patient and Link Doctor screens in `apps/mobile/src/features/doctorLinking/`
- [ ] T098 [US5] Implement shared doctor dashboard data contract in `packages/contracts/src/doctorDashboard.ts`
- [ ] T099 [US5] Implement web doctor dashboard and linked timeline in `apps/web/src/features/doctor/`
- [ ] T100 [US5] Implement mobile doctor dashboard and linked timeline in `apps/mobile/src/features/doctor/`
- [ ] T101 [US5] Add denied-access audit events for unlinked doctor attempts in `packages/contracts/src/audit.ts`

**Checkpoint**: Doctor can view linked active patients only and cannot edit patient entries.

---

## Phase 8: User Story 6 - Doctor JSON exports (Priority: P3)

**Goal**: Doctor exports linked patient day/month data in all required JSON modes.

**Independent Test**: Export day and current/partial month in all three modes and
validate against the export schema.

### Tests for User Story 6

- [ ] T102 [P] [US6] Create export date range tests in `packages/contracts/src/exportRanges.test.ts`
- [ ] T103 [P] [US6] Create export schema validation tests in `tests/integration/export_schema.test.ts`
- [ ] T104 [P] [US6] Create export access control tests in `tests/security/export_access.test.ts`
- [ ] T105 [P] [US6] Create images-only mode test in `tests/integration/images_only_export.test.ts`

### Implementation for User Story 6

- [ ] T106 [P] [US6] Implement shared export date range logic in `packages/contracts/src/exportRanges.ts`
- [ ] T107 [P] [US6] Implement shared export mode schema in `packages/contracts/src/exportSchema.ts`
- [ ] T108 [US6] Implement `export_patient_data` backend function in `apps/supabase/functions/export_patient_data/`
- [ ] T109 [US6] Implement signed image reference generation in `apps/supabase/functions/export_patient_data/images.ts`
- [ ] T110 [US6] Implement doctor export request client contract in `packages/contracts/src/doctorExports.ts`
- [ ] T111 [US6] Implement web doctor export screen in `apps/web/src/features/exports/`
- [ ] T112 [US6] Implement mobile doctor export screen in `apps/mobile/src/features/exports/`
- [ ] T113 [US6] Record export audit events in `packages/contracts/src/audit.ts`

**Checkpoint**: Doctor exports are scoped, valid, and mode-correct.

---

## Phase 9: User Story 7 - Language, voice language, and theme settings (Priority: P3)

**Goal**: Users can select Serbian/English app language, Serbian/English voice
language, and light/dark theme.

**Independent Test**: Switch language and theme across patient and doctor
workflows without data loss, then verify voice language is used where supported.

### Tests for User Story 7

- [ ] T114 [P] [US7] Create translation coverage test in `packages/i18n/src/coverage.test.ts`
- [ ] T115 [P] [US7] Create theme token tests in `packages/ui-tokens/src/theme.test.ts`
- [ ] T116 [P] [US7] Create web language/theme e2e test in `apps/web/tests/e2e/settings_language_theme.spec.ts`
- [ ] T117 [P] [US7] Create mobile language/theme smoke test in `apps/mobile/tests/e2e/settings_language_theme.spec.ts`

### Implementation for User Story 7

- [ ] T118 [P] [US7] Implement Serbian translations in `packages/i18n/src/sr.ts`
- [ ] T119 [P] [US7] Implement English translations in `packages/i18n/src/en.ts`
- [ ] T120 [US7] Implement shared i18n runtime in `packages/i18n/src/runtime.ts`
- [ ] T121 [US7] Implement shared theme runtime in `packages/ui-tokens/src/themeRuntime.ts`
- [ ] T122 [US7] Implement web settings screen in `apps/web/src/features/settings/`
- [ ] T123 [US7] Implement mobile settings screen in `apps/mobile/src/features/settings/`
- [ ] T124 [US7] Replace hardcoded core workflow strings with translation keys in `apps/web/src/` and `apps/mobile/src/`

**Checkpoint**: Bilingual UI and light/dark theme are functional in both apps.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, documentation, Figma handoff, platform smoke, and
release readiness.

- [ ] T125 [P] Create simple Figma wireframe checklist for patient and doctor screens in `docs/design/figma-wireframe-checklist.md`
- [ ] T126 [P] Create privacy/consent copy in Serbian and English in `docs/product/consent-copy.md`
- [ ] T127 [P] Create storage budget monitoring notes in `docs/operations/storage-budget.md`
- [ ] T128 Run RLS/security test suite and record results in `docs/test-results/rls-security.md`
- [ ] T129 Run quickstart web validation and record results in `docs/test-results/web-validation.md`
- [ ] T130 Run Android APK validation and record results in `docs/test-results/android-validation.md`
- [ ] T131 Run Huawei Android validation if device is available and record results in `docs/test-results/huawei-validation.md`
- [ ] T132 Validate `quickstart.md` scenarios end-to-end and record unresolved issues in `docs/test-results/v1-acceptance.md`
- [ ] T133 Review all doctor-note references to confirm doctor notes remain future scope in `specs/001-patient-research-tracking/`
- [ ] T134 Review all automatic-deletion references to confirm no V1 automatic deletion in `specs/001-patient-research-tracking/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **US1 and US2**: Start after Foundational; both are P1, but US1 is the first
  working slice and should be completed first.
- **US3, US4, US5**: Start after US1 data flow is stable; may proceed in parallel
  after shared entry contracts are stable.
- **US6**: Depends on US2 data model, US4 photo metadata, and US5 doctor access.
- **US7**: Can begin after shared i18n/theme foundations are ready; must finish
  before acceptance.
- **Polish**: Depends on target stories being implemented.

### User Story Dependencies

- **US1**: Requires foundation only.
- **US2**: Requires foundation and shared form primitives.
- **US3**: Requires US1 entry create/read contract.
- **US4**: Requires US1 entry contract and storage policies.
- **US5**: Requires foundation, role profiles, and RLS.
- **US6**: Requires US2, US4, and US5.
- **US7**: Requires shared i18n/theme foundations and must touch all workflows.

## Parallel Opportunities

- Setup package skeleton tasks T005-T010 can run in parallel.
- Foundational shared package tasks T021-T026 can run in parallel after migrations
  are drafted.
- Tests within each user story can run in parallel before implementation.
- Web and mobile screens for the same completed shared contract can be developed
  in parallel.
- US3 offline-lite, US4 photos/voice, and US5 doctor linking can proceed in
  parallel after US1 stabilizes if separate developers own shared-contract
  integration points.

## Parallel Example: User Story 2

```text
Task: "Create baseline profile validation tests in packages/forms/src/baselineProfile.test.ts"
Task: "Create daily form validation tests in packages/forms/src/dailyForm.test.ts"
Task: "Create symptom and stool validation tests in packages/forms/src/symptomStool.test.ts"
Task: "Implement baseline profile schema in packages/forms/src/baselineProfile.ts"
Task: "Implement daily form schema in packages/forms/src/dailyForm.ts"
Task: "Implement symptom form schema in packages/forms/src/symptomForm.ts"
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 first working slice.
3. Stop and validate patient login, consent, text entry save/read/timeline.
4. Complete US2 full forms.
5. Add US3 offline-lite, US4 photos/voice, and US5 doctor linking.
6. Add US6 exports and US7 settings.
7. Run full quickstart validation.

### Incremental Delivery

Each user story should be demonstrable independently after its checkpoint. Do not
begin export work until role/RLS and doctor-patient linking are demonstrably
correct.
