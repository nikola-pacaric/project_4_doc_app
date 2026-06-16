<!--
Sync Impact Report
Version change: none -> 1.0.0
Modified principles: initial constitution
Added sections: Core Principles, Product Constraints, Development Workflow and Quality Gates, Governance
Removed sections: none
Templates requiring updates: .specify/templates/* copied from Spec Kit v0.10.2, no project-specific template mutation required
Deferred items: none
-->

# Medical Tracking Research App Constitution

## Core Principles

### I. Research Data Retention and Traceability
Research data MUST NOT be hard-deleted during the three-month research period.
Patient entries, photos, metadata, visibility changes, and local delete/hide actions
MUST remain represented in the database so research state and local user state are
both auditable. Any delete or hide action in MVP MUST be implemented as a tracked
visibility or lifecycle state, not as physical row removal.

### II. Role-Bound Access and Consent
Each account MUST have exactly one role: patient or doctor. Role switching inside
one account is out of scope for MVP. Doctor access to patient data MUST require an
active invite-code-created relationship, and doctors MUST NOT see unrelated
patients. Users MUST accept a consent/privacy screen before using the app.

### III. Offline-Lite With Explicit Sync State
MVP MUST support offline-lite patient entry creation for text entries, cached own
history viewing, pending timestamp edits, pending-sync indicators, and sync when
connectivity returns. MVP MUST NOT promise full offline parity: offline photo
upload, fresh export, fetching new doctor/patient data, and complex multi-device
conflict resolution are out of scope.

### IV. Mobile-First Bilingual Medical UX
The app MUST be mobile-first, web-compatible, readable, older-user friendly, and
available in Serbian and English from the start. UI strings MUST come from
translation resources rather than hardcoded component text. Light and dark themes
MUST be supported. Screens SHOULD be wireframed in Figma before implementation.

### V. Storage, Export, and Voice Discipline
Photos MUST be compressed before upload, thumbnails MUST be generated, originals
MUST NOT be uploaded, and base64 image data MUST NOT be stored in Postgres.
Storage MUST use private Supabase Storage with access checks. Exports are doctor
features in MVP and MUST generate JSON on demand. Voice input MUST use free
device/browser recognition only, MUST NOT store raw audio, and MUST fall back to
typing when unavailable.

## Product Constraints

- Authoritative source order: user-provided direct decisions override
  `docs/intake/Final MVP Decisions.pdf`, which overrides
  `docs/intake/Product Development Plan.pdf` when conflicts exist.
- MVP targets Android APK, Huawei Android APK, and browser web app.
- Supabase is the planned backend platform for Auth, Postgres, Storage, and RLS.
- Supabase free-tier storage constraints must be respected for a small 3-5 user
  research pilot.
- Doctor-patient linking via invite codes is in MVP.
- Offline-lite entry creation and sync are in MVP.
- Serbian UI support is in MVP.
- Automatic deletion and post-research cleanup tooling are future features.

## Development Workflow and Quality Gates

- Implementation MUST NOT begin until the spec, plan, task list, and handoff are
  reviewed for conflicts against this constitution.
- RLS, storage privacy, invite-code redemption, and export access require explicit
  tests before release.
- Patient and doctor workflows must be tested separately with linked and unlinked
  accounts.
- Android, Huawei Android, and Chromium-based browser testing are required release
  checks.
- Supabase implementation details must be verified against current Supabase
  documentation before schema, RLS, storage, or Auth code is written.

## Governance

This constitution supersedes conflicting implementation preferences and earlier
planning notes. Amendments require an explicit dated documentation change that
states the changed principle, reason, affected specs/tasks, and migration impact.
Versioning follows semantic versioning: MAJOR for incompatible governance changes,
MINOR for new principles or materially expanded rules, PATCH for clarifications.
Every implementation plan and task breakdown must include a constitution check.

**Version**: 1.0.0 | **Ratified**: 2026-06-14 | **Last Amended**: 2026-06-14
