<!--
Sync Impact Report
Version change: template -> 1.0.0
Modified principles: placeholder principles -> project-specific principles
Added sections: Product & Technical Constraints; Development Workflow & Quality Gates
Removed sections: none
Templates requiring updates: plan-template.md updated; spec-template.md updated; tasks-template.md updated
Follow-up TODOs: none
-->

# Health Research Tracking App Constitution

## Core Principles

### I. Patient-Owned, Privacy-First Data
Patient data MUST be treated as patient-owned private research data. The system
MUST protect health notes, photos, profile details, and exports with
authenticated access, private storage, row-level access controls, and explicit
consent before app use. Doctors MUST only access patients with active links.
Formal medical diagnosis and formal compliance certification are outside V1.

### II. Role-Boundary Integrity
Each account MUST have exactly one role: patient or doctor. Doctor accounts for
V1 MUST be manually created in Supabase, not self-selected during signup.
Patients MUST create, edit, and delete their own entries. Doctors MUST view
linked patient timelines and export allowed data, but doctor-authored notes are
future scope and MUST NOT be implemented in V1.

### III. Same Workflow Across Separate Apps
The web app and native Android app MUST expose the same user workflows, roles,
data model, validation rules, localization behavior, and export semantics while
remaining separate applications connected to the same Supabase backend. Shared
contracts, shared form definitions, and shared translation keys SHOULD be used
to avoid drift.

### IV. Offline-Lite, Not Full Offline Sync
V1 MUST support offline-lite behavior for patients: view cached own history,
open previously cached days, create text entries, edit timestamps for pending
entries, show pending sync state, and sync pending text entries when online
returns. V1 MUST NOT support offline photo upload, fresh doctor data fetches,
fresh exports with signed image URLs, or complex multi-device conflict
resolution.

### V. Testable Medical Research UX
V1 MUST provide complete baseline, daily, symptom, stool, medication, meal,
exercise, note, and custom-field forms required by the intake. UI MUST be
mobile-first, older-user friendly, clean medical style, bilingual
Serbian/English from the start, and light/dark theme capable. Features MUST be
defined with independent acceptance criteria before implementation.

## Product & Technical Constraints

- V1 targets a separate web application and a separate native Android
  application, both connected to the same Supabase project and same data.
- Android APK and Huawei Android testing are required targets. iOS can remain
  future scope unless explicitly added.
- Supabase Auth, Postgres, Storage, and RLS are the planned backend foundation.
- Photos MUST be resized before upload, with max width 1280px, JPEG format,
  quality 0.8, thumbnails, metadata rows, private storage paths, and no original
  full-resolution uploads.
- Voice input MUST use free device/browser speech recognition only, with
  Serbian sr-RS and English en-US where supported, editable transcripts, no raw
  audio storage, and typing fallback.
- Export features in V1 belong to doctor accounts only and MUST support selected
  day and current/partial month exports in the specified JSON modes.
- No automatic deletion is allowed during the three-month research period.
  Archive and cleanup tools are future scope.

## Development Workflow & Quality Gates

- Specifications, plans, data models, contracts, and tasks MUST be produced
  before implementation starts.
- The first implementation slice MUST be login -> patient daily timeline -> add
  text entry -> save to Supabase -> read from Supabase -> display on timeline.
- RLS and role boundary tests MUST be planned before any feature is considered
  complete.
- Photo compression and private storage behavior MUST be validated on web and
  Android before photo work is complete.
- Offline-lite behavior MUST be tested for pending text entries and sync
  recovery.
- Bilingual UI MUST use translation files; UI text MUST NOT be hardcoded inside
  components.
- Figma wireframes SHOULD be created before UI implementation, but over-polish
  MUST NOT block core workflow validation.

## Governance

This constitution governs all V1 specification, planning, and implementation
work. Any change that weakens patient privacy, role isolation, offline-lite
scope, bilingual UX, or testability requires an explicit constitution amendment
with rationale and downstream spec/task updates.

Versioning follows semantic versioning. Major versions change or remove
governing principles. Minor versions add principles or materially expand
governance. Patch versions clarify existing rules without changing obligations.

Spec, plan, and task reviews MUST check compliance with this constitution before
implementation. Any exception MUST be documented in the plan's complexity
tracking table with the rejected simpler alternative.

**Version**: 1.0.0 | **Ratified**: 2026-06-16 | **Last Amended**: 2026-06-16
