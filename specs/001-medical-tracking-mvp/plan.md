# Implementation Plan: Medical Tracking Research MVP

**Branch**: `001-medical-tracking-mvp` | **Date**: 2026-06-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-medical-tracking-mvp/spec.md`

## Summary

Build a mobile-first medical tracking MVP for patients and doctors. Patients record meals, symptoms, medications, exercise, daily notes, custom fields, and online photos; doctors link to patients through invite codes and export research JSON. The MVP includes offline-lite text entry creation and sync, Serbian/English UI, free device/browser voice input, Supabase-backed access control, and strict research data retention with local hide/delete state tracking instead of hard deletion.

## Technical Context

**Language/Version**: To be selected by implementation team; recommended TypeScript-capable cross-platform client for Android APK, Huawei Android APK, and web.

**Primary Dependencies**: Supabase Auth, Supabase Postgres, Supabase Storage, Supabase RLS, client-side image compression, device/browser speech recognition, i18n/translation resources, light/dark theming.

**Storage**: Supabase Postgres for structured data and private Supabase Storage for compressed images/thumbnails.

**Testing**: Unit, integration, RLS/policy, storage policy, export contract, offline sync, and end-to-end smoke tests across Android, Huawei Android, and Chromium-based web.

**Target Platform**: Android APK, Huawei Android APK, and browser web app.

**Project Type**: Cross-platform patient/doctor application with Supabase backend.

**Performance Goals**: Entry creation feedback within 5 seconds offline; pending sync within 30 seconds after connectivity returns under normal conditions; photo upload blocked above safe size limits; exports generated on demand for selected day/month.

**Constraints**: Supabase free-tier-friendly storage for 3-5 pilot users; no paid transcription API; no raw audio storage; no hard deletion during research period; no original image upload; Serbian and English UI at launch.

**Scale/Scope**: MVP pilot for 3-5 users during a three-month research period; architecture should not prevent later cleanup/archive tooling or fuller doctor-configurable forms.

## Constitution Check

*GATE: Must pass before implementation. Re-check after design changes.*

- **Research Data Retention and Traceability**: PASS. Plan uses retained rows plus visibility/lifecycle states for local hide/delete.
- **Role-Bound Access and Consent**: PASS. One account has one role; invite-code access is required; consent is mandatory.
- **Offline-Lite With Explicit Sync State**: PASS. Plan includes offline-lite text entries and excludes offline photo/export/new doctor data fetch.
- **Mobile-First Bilingual Medical UX**: PASS. Serbian/English translation files, older-user-friendly UI, light/dark themes, and Figma-first wireframes are required.
- **Storage, Export, and Voice Discipline**: PASS. Plan requires compressed private images, thumbnails, no base64, doctor-only exports, free speech recognition, and typing fallback.

## Project Structure

### Documentation (this feature)

```text
specs/001-medical-tracking-mvp/
+-- spec.md
+-- plan.md
+-- research.md
+-- data-model.md
+-- quickstart.md
+-- contracts/
|   +-- api-contract.md
+-- checklists/
|   +-- requirements.md
+-- tasks.md
+-- analysis.md
```

### Proposed Source Code (for programmers; not created by this pass)

```text
app/
+-- src/
|   +-- auth/
|   +-- components/
|   +-- entries/
|   +-- exports/
|   +-- i18n/
|   +-- linking/
|   +-- offline/
|   +-- photos/
|   +-- settings/
|   +-- storage/
|   +-- theme/
|   +-- voice/
+-- tests/
    +-- e2e/
    +-- integration/
    +-- unit/

supabase/
+-- migrations/
+-- policies/
+-- storage/

docs/
+-- architecture/
+-- design/
```

**Structure Decision**: Use a cross-platform client plus Supabase backend structure. Exact framework selection remains with the implementation team, but the architecture must satisfy Android APK, Huawei Android APK, and web delivery.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Phase 0: Research Decisions

See [research.md](research.md). No blocking clarification remains; implementation framework selection is a programmer decision constrained by target platforms.

## Phase 1: Design Artifacts

- Data model: [data-model.md](data-model.md)
- Contracts: [contracts/api-contract.md](contracts/api-contract.md)
- Validation guide: [quickstart.md](quickstart.md)

## Phase 2: Task Generation

See [tasks.md](tasks.md). Tasks are documentation-only instructions for programmers and have not been executed.
