# Implementation Plan: V1 Patient Research Tracking App

**Branch**: `001-patient-research-tracking` | **Date**: 2026-06-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-patient-research-tracking/spec.md`

## Summary

Build V1 as two separate client applications, one web app and one native Android
app, connected to the same Supabase backend and governed by shared contracts,
form schemas, validation rules, translations, and export rules. The product
supports patient-owned medical research tracking, complete baseline/daily/symptom
forms, offline-lite patient text entries, compressed private photos, free
device/browser voice input, invite-code doctor linking, doctor-only exports,
Serbian/English UI, and light/dark theme.

The first deliverable slice is: login -> patient daily timeline -> add text entry
-> save to Supabase -> read from Supabase -> display on timeline. Later slices
layer full forms, offline-lite, photos/voice, doctor linking, exports, and
settings without changing the shared data model.

## Technical Context

**Language/Version**: TypeScript for web, mobile, shared packages, and validation
contracts; SQL for Supabase schema, functions, and RLS policies. Implementers
must choose current stable versions at development start.

**Primary Dependencies**: React web app with Vite; React Native Android app,
preferably Expo with development/prebuild support where native modules are
needed; Supabase Auth, Postgres, Storage, RLS, and Edge Functions/RPC for
privileged operations; shared TypeScript packages for contracts, forms,
translations, and export schemas.

**Storage**: Supabase Postgres for rows; private Supabase Storage bucket for
compressed photos and thumbnails; app-local persistent cache/queue for
offline-lite patient text entries and cached own history.

**Testing**: Unit and component tests for shared packages, web UI, and mobile UI;
integration tests for patient and doctor workflows; RLS/policy tests against
Supabase local or staging; web end-to-end tests; Android APK smoke tests on a
standard Android phone and Huawei Android phone when available.

**Target Platform**: Modern web browsers, Android APK, Huawei Android APK. iOS is
future scope unless separately added.

**Project Type**: Multi-app product in one repository: separate web app, separate
native Android app, shared packages, and Supabase backend configuration.

**Performance Goals**:

- Patient timeline opens recent/cached day in under 2 seconds on typical test
  devices after initial login.
- Online text entry save returns visible success or retryable failure in under 2
  seconds on normal connectivity.
- Offline text entry creation is immediate and syncs within 60 seconds of
  connectivity returning.
- Photo compression completes before upload and targets 250-500 KB main images
  and 20-60 KB thumbnails where source image quality allows.
- Doctor day/month exports complete in under 30 seconds for expected V1 research
  volumes.

**Constraints**:

- No doctor self-service signup in V1; doctor accounts are manually created in
  Supabase.
- One account has one role.
- Doctor notes are future scope.
- Offline-lite supports patient text entries only; no offline photo upload,
  fresh exports, fresh doctor data fetches, or complex conflict resolution.
- Photos must be resized to max width 1280px, JPEG quality 0.8, with thumbnail,
  metadata row, private storage path, and no original full-resolution upload.
- Voice input uses free device/browser recognition only; no paid transcription
  API and no raw audio storage.
- Three-month research data must not be automatically deleted in V1.

**Scale/Scope**: V1 supports 3-5 research users on Supabase free-tier-friendly
storage, with enough structure to expand after the research pilot.

**Reference Basis**:

- Supabase RLS guidance: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase private asset serving/signed URLs: https://supabase.com/docs/guides/storage/serving/downloads
- React Native TypeScript guidance: https://reactnative.dev/docs/typescript
- Expo EAS Build guidance: https://docs.expo.dev/build/introduction/
- Vite guide: https://vite.dev/guide/

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Patient-owned, privacy-first data**: PASS. Plan uses authenticated access,
  Supabase RLS, private storage, explicit consent, doctor-only exports, and audit
  events. Formal certification is outside V1.
- **Role-boundary integrity**: PASS. One role per account, doctor accounts
  manually created, patient-created entries owned by patients, doctors view only
  active linked patients, and doctor notes are excluded.
- **Same workflow across separate apps**: PASS. Web and Android apps are separate
  clients using shared contracts, forms, i18n keys, and backend rules.
- **Offline-lite, not full offline sync**: PASS. Offline behavior is limited to
  cached own history and patient text-entry queue; photos, fresh exports, and
  doctor fetches require internet.
- **Testable medical research UX**: PASS. Full forms, bilingual settings,
  light/dark mode, web/Android/Huawei validation, role/RLS tests, and first
  working slice are planned.

## Project Structure

### Documentation (this feature)

```text
specs/001-patient-research-tracking/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── app-contracts.md
│   ├── export-json.schema.json
│   └── supabase-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/
├── web/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── routes/
│   │   └── test/
│   └── tests/
│       └── e2e/
├── mobile/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── navigation/
│   │   └── test/
│   └── tests/
│       └── e2e/
└── supabase/
    ├── functions/
    ├── migrations/
    ├── policies/
    └── tests/

packages/
├── contracts/
├── forms/
├── i18n/
├── photo/
├── sync/
├── supabase-client/
└── ui-tokens/

tests/
├── integration/
├── security/
└── fixtures/
```

**Structure Decision**: Use a monorepo so the web and native Android apps remain
separate deployable clients while sharing typed contracts, form definitions,
translation keys, photo rules, sync rules, and export schemas. Supabase backend
configuration lives under `apps/supabase/` to keep schema, policies, functions,
and policy tests versioned with the app contracts.

## Phase 0: Research Decisions

See [research.md](./research.md). Key decisions:

- Use separate React/Vite web and React Native Android clients in one monorepo.
- Use Supabase Auth/Postgres/Storage/RLS as shared backend.
- Keep doctor account creation manual in Supabase for V1.
- Model forms as predefined schema-driven forms plus `custom_fields`.
- Use offline-lite local queue for patient text entries only.
- Generate doctor exports server-side or through guarded RPC/Edge Function paths
  so access checks and signed image references are consistent.

## Phase 1: Design & Contracts

Design artifacts:

- [data-model.md](./data-model.md) defines entities, fields, relationships,
  validation rules, and state transitions.
- [contracts/supabase-contract.md](./contracts/supabase-contract.md) defines
  table, policy, function, and storage contract expectations.
- [contracts/app-contracts.md](./contracts/app-contracts.md) defines app workflow
  parity, route/screen contracts, sync behavior, photo behavior, and voice
  behavior.
- [contracts/export-json.schema.json](./contracts/export-json.schema.json)
  defines the doctor export package shape.
- [quickstart.md](./quickstart.md) defines implementation validation scenarios.

## Post-Design Constitution Check

- **Patient-owned data**: PASS. Data model isolates patient-owned entries/photos,
  doctor access links, private storage metadata, and audit events.
- **Role-boundary integrity**: PASS. Contracts define doctor manual provisioning,
  one role per profile, invite-code linking, and denied doctor edits.
- **Same workflow across apps**: PASS. App contracts require workflow parity and
  shared packages.
- **Offline-lite**: PASS. Data model and app contracts isolate local pending text
  entries from unsupported offline actions.
- **Testable UX**: PASS. Quickstart and tasks include web, Android, Huawei,
  bilingual, theme, RLS, offline, photo, voice, and export validation.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Separate web and native apps | User explicitly requires separate apps sharing data and workflow | Single React+Capacitor app would be simpler but does not meet the clarified target |
| Shared packages in monorepo | Needed to prevent drift between separate apps | Duplicating forms/i18n/contracts in each app risks inconsistent data and workflows |
| Supabase RLS plus function/RPC boundaries | Needed for patient data privacy and doctor export/linking controls | Client-only checks are insufficient for patient health research data |
