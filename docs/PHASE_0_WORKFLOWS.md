# Phase 0 Workflows And Wireframe Map

## Purpose

This document turns Phase 0 into an implementation-ready product map for V1. It uses `PLANNING.md` as the source for scope, roles, non-goals, acceptance criteria, and risks.

Phase 0 is complete when the core screens, navigation, data boundaries, and first implementation slice are clear enough to start Phase 1 without expanding V1 scope.

## V1 Guardrails

- V1 is a private 3-month patient research tracking pilot.
- V1 is not a diagnosis tool and must not claim formal medical-device or compliance certification.
- Patient data remains private by default.
- Doctors can read linked patient data only through active `doctor_patient_access`.
- Doctors cannot edit or delete patient entries.
- Consent/privacy gating must happen before app workflows.
- All visible UI text must use translation keys.
- Web and Android must share contracts, forms, i18n, Supabase wrappers, photo helpers, sync helpers, and UI tokens.
- No Supabase service-role credentials may ship to web or mobile clients.
- No original full-resolution photo upload, no base64 image storage in rows, and no base64 images in exports.

## Out Of Scope For V1

- Doctor notes.
- Patient revocation UI.
- Paid transcription.
- Raw audio storage.
- Full offline sync.
- Multi-device conflict resolution.
- Offline photo upload.
- Automatic deletion or post-research cleanup.
- iOS release.
- Formal compliance certification claims.

## Primary Navigation Model

### Unauthenticated

```text
Launch
  -> Language/theme pre-app defaults
  -> Auth choice
       -> Patient signup
       -> Patient login
       -> Doctor login
```

### Patient

```text
Login/signup
  -> Consent/privacy gate when missing or outdated
  -> Patient home timeline
       -> Add text entry
       -> Edit timestamp
       -> Open entry details
       -> Open baseline profile
       -> Open daily form
       -> Redeem doctor invite code
       -> Settings
```

### Doctor

```text
Doctor login
  -> Doctor dashboard
       -> Create invite code
       -> Revoke unused invite code
       -> Open linked patient
            -> Read-only patient timeline
            -> Export selected day
            -> Export selected/current partial month
       -> Settings
```

## Screen Map

| Screen                  | User            | Purpose                                                                                | Phase dependency |
| ----------------------- | --------------- | -------------------------------------------------------------------------------------- | ---------------- |
| Auth choice             | Unauthenticated | Select patient signup/login or doctor login                                            | Phase 3          |
| Patient signup          | Patient         | Create patient account with immutable patient role                                     | Phase 3          |
| Login                   | Patient, doctor | Authenticate account                                                                   | Phase 3          |
| Consent gate            | Patient         | Capture required consent/privacy acknowledgement before workflows                      | Phase 3          |
| Patient timeline        | Patient         | View recent-day entries and status                                                     | Phase 3          |
| Text entry editor       | Patient         | Create/edit timestamped text entry                                                     | Phase 3          |
| Baseline profile        | Patient         | Capture baseline research profile                                                      | Phase 4          |
| Daily form              | Patient         | Capture daily tracking fields                                                          | Phase 4          |
| Entry detail forms      | Patient         | Capture meal, symptom, stool, medication, exercise, menstruation, note, custom entries | Phase 4          |
| Offline pending state   | Patient         | Show cached days and unsynced text changes                                             | Phase 5          |
| Photo attachment        | Patient         | Preview, compress, thumbnail, upload metadata and private files                        | Phase 6          |
| Voice helper            | Patient         | Append free device/browser transcript to text fields where supported                   | Phase 6          |
| Invite redemption       | Patient         | Redeem one doctor invite code                                                          | Phase 7          |
| Doctor dashboard        | Doctor          | See linked patients and invite tools                                                   | Phase 7          |
| Linked patient timeline | Doctor          | Read active linked patient history                                                     | Phase 7          |
| Export panel            | Doctor          | Create selected-day or partial-month JSON exports                                      | Phase 8          |
| Settings                | Patient, doctor | Language, voice language, theme                                                        | Phase 9          |

## Low-Fidelity Wireframes

These wireframes are intentionally simple. They define layout and navigation, not final visual polish.

### Auth Choice

```text
+--------------------------------+
| app.title                      |
| app.subtitle                   |
|                                |
| [auth.patientSignup]           |
| [auth.patientLogin]            |
| [auth.doctorLogin]             |
|                                |
| [settings.language] [theme]    |
+--------------------------------+
```

Implementation notes:

- Keep the first screen calm, readable, and mobile-first.
- Do not expose app data before authentication.
- Keep all labels behind i18n keys.

### Consent Gate

```text
+--------------------------------+
| consent.title                  |
| consent.summary                |
|                                |
| [ ] consent.privatePilot       |
| [ ] consent.notDiagnosis       |
| [ ] consent.dataUse            |
|                                |
| [consent.accept]               |
| [auth.signOut]                 |
+--------------------------------+
```

Implementation notes:

- This blocks patient workflows until accepted.
- Keep the wording non-diagnostic and research-focused.
- Store acceptance in a patient-owned consent/profile record.

### Patient Timeline

```text
+--------------------------------+
| timeline.today       [settings]|
| sync.status                    |
|                                |
| [entry.addText]                |
| [forms.daily] [forms.baseline] |
|                                |
| date.selector                  |
| - entry.time entry.type status |
| - entry.time entry.preview     |
| - pending.entry marker         |
|                                |
| [invite.redeem]                |
+--------------------------------+
```

Implementation notes:

- Phase 3 starts with recent-day text entries only.
- Offline and pending markers arrive in Phase 5.
- Photos and voice arrive in Phase 6.
- Timeline CRUD must respect patient ownership.

### Text Entry Editor

```text
+--------------------------------+
| entry.editorTitle              |
| [entry.timestamp]              |
|                                |
| [entry.textArea]               |
| [voice.start]                  |
|                                |
| [entry.save] [entry.cancel]    |
| status.message                 |
+--------------------------------+
```

Implementation notes:

- Timestamp editing is part of the patient first slice.
- Voice control must be optional and gracefully hidden or disabled when unsupported.
- Validate before persistence.

### Baseline And Daily Forms

```text
+--------------------------------+
| form.title             [save]  |
| form.progress                  |
|                                |
| section.heading                |
| field.label                    |
| field.control                  |
| field.error                    |
|                                |
| [previous] [next]              |
+--------------------------------+
```

Implementation notes:

- Forms should be schema-driven where possible.
- Required field behavior must be consistent on web and Android.
- Do not hardcode field labels inside screens.

### Doctor Dashboard

```text
+--------------------------------+
| doctor.dashboardTitle [settings]|
|                                |
| [invite.create]                |
| invite.list                    |
| - code status expires [revoke] |
|                                |
| linkedPatients.title           |
| - patient.displayName [open]   |
+--------------------------------+
```

Implementation notes:

- Manual doctor provisioning happens in Supabase, not through a public signup screen.
- Invite codes are single-use, revocable before use, and expire after 7 days.
- Revoking only applies to unused invite codes in V1.

### Linked Patient Timeline And Export

```text
+--------------------------------+
| patient.name          [back]   |
| readonly.badge                 |
|                                |
| date.selector                  |
| timeline.readOnlyList          |
|                                |
| export.range                   |
| export.mode                    |
| [export.create]                |
| export.status                  |
+--------------------------------+
```

Implementation notes:

- Doctors can read only active linked patients.
- Doctors must never edit or delete patient entries.
- Exports must never include base64 images.
- Export access must be audited.

### Settings

```text
+--------------------------------+
| settings.title                 |
| settings.appLanguage           |
| settings.voiceLanguage         |
| settings.theme                 |
|                                |
| [settings.save]                |
+--------------------------------+
```

Implementation notes:

- App language supports Serbian and English.
- Voice language supports `sr-RS` and `en-US` where available.
- Theme uses shared tokens for light and dark modes.

## First Functional Slice

Build Phase 1 foundation first, then implement Phase 3 as the first vertical behavior:

```text
Patient account
  -> consent accepted
  -> create timestamped text entry
  -> reload
  -> timeline shows entry
```

This slice intentionally excludes full forms, offline-lite, photos, voice, invite linking, and exports until their planned phases.

## Phase 1 Inputs From This Map

Create the monorepo structure from `PLANNING.md`:

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

Initial shared package priorities:

- `packages/contracts`: roles, entry shapes, export JSON foundations.
- `packages/i18n`: Serbian/English dictionary shape and early auth/consent/timeline keys.
- `packages/ui-tokens`: light/dark colors, spacing, typography, control sizing.
- `packages/supabase-client`: browser/mobile-safe client setup only, no service-role credentials.

Initial app priorities:

- Web shell can boot and import shared packages.
- Mobile shell can boot and import shared packages.
- Supabase folder has migrations, fixtures, tests, and docs separated.
- Env templates are separate for web, mobile, and Supabase.

## Validation Checklist

- V1 workflows are mapped without adding non-goal scope.
- Patient first slice is clear and comes before broad UI polish.
- Doctor workflows are read-only for patient data.
- Consent/privacy gate is explicit.
- Localization and theme are present from the start.
- RLS, export, photo, and offline-lite are called out as release gates.
- Phase 1 has enough direction to scaffold the monorepo.

## Phase 0 Status

Status: implementation-ready.

Remaining optional design task: convert these low-fidelity wireframes into a Figma file if a visual design pass is needed. This does not block Phase 1 or the patient first functional slice.
