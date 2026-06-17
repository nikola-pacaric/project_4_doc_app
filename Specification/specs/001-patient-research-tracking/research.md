# Research: V1 Patient Research Tracking App

## Decision: Use separate React web and React Native Android apps in one monorepo

**Rationale**: The clarified requirement asks for separate web and native apps
that show the same data and workflow. A monorepo keeps those applications
separate while allowing shared form schemas, contracts, translations, photo
rules, and export validation.

**Alternatives considered**:

- Single React + Capacitor app: simpler, but conflicts with the clarified
  "separate" app target.
- Fully separate repositories: gives hard separation, but increases drift risk
  for medical forms and access rules.
- Separate native per platform: unnecessary for V1 because only Android/Huawei
  Android is required.

## Decision: Use Supabase as the shared backend foundation

**Rationale**: Intake repeatedly names Supabase. Supabase Auth, Postgres, RLS,
Storage, and Edge Functions/RPC match the need for patient-owned rows, private
photo storage, invite-code linking, and export generation. Official Supabase
guidance emphasizes enabling RLS on exposed schemas and using storage policies
for authenticated/private objects.

**Alternatives considered**:

- Custom backend from scratch: more control, but slower and unnecessary for 3-5
  research users.
- Firebase: viable for mobile/web, but intake and data/export needs already
  align with relational Supabase tables and RLS.
- Local-only app: conflicts with doctor dashboard, sync, and export needs.

## Decision: Doctor accounts are manually provisioned in Supabase for V1

**Rationale**: The user clarified that doctor accounts are manually created in
Supabase only for now. This reduces risk of unauthorized doctor role creation
while allowing invite-code linking after a doctor account exists.

**Alternatives considered**:

- Anyone chooses doctor at signup: simpler UX but unacceptable role risk.
- In-app admin panel: useful later, but not required for V1 and adds admin
  security surface.

## Decision: Use schema-driven predefined forms with custom fields

**Rationale**: Full V1 forms are required, but a full doctor-configurable form
builder is not. Shared form schemas let both apps render identical baseline,
daily, symptom, stool, meal, medication, exercise, daily note, and custom fields.
Extra fields fit `custom_fields` JSONB per entry/category.

**Alternatives considered**:

- Hardcoded forms separately in each app: fast initially, but high drift risk.
- Full dynamic form builder: too large for MVP and not requested.

## Decision: Keep offline support to offline-lite patient text entries

**Rationale**: Intake asks for offline-lite: cached own history, previously
cached days, text entry creation, timestamp edits, pending sync, and sync on
connectivity return. It explicitly excludes photo upload, fresh doctor data,
fresh exports, and complex conflict resolution.

**Alternatives considered**:

- Full offline sync: too complex for V1 and risky for medical research data.
- No offline support: conflicts with final MVP decisions.

## Decision: Process photos client-side before upload

**Rationale**: Intake requires max width 1280px, JPEG quality 0.8, thumbnail
generation, no original upload, private bucket storage, and metadata rows.
Client-side compression reduces storage use for Supabase free-tier-friendly
research usage.

**Alternatives considered**:

- Upload originals and process server-side: violates intake and uses more
  storage.
- Store base64 in Postgres: explicitly disallowed and poor for database size.

## Decision: Use free device/browser speech recognition only

**Rationale**: Intake forbids paid transcription APIs, raw audio storage, and
OpenAI Whisper API for MVP. Voice must be reusable across text fields, editable
before save, and support Serbian/English where the environment allows it.

**Alternatives considered**:

- Paid transcription API: explicitly disallowed.
- Raw audio upload for later transcription: explicitly disallowed.

## Decision: Generate exports through guarded server-side/RPC paths

**Rationale**: Exports must include only data a doctor may view, optionally
include signed image references, and vary fields by export mode. A guarded
function/RPC path keeps date range logic, mode filtering, and access checks
consistent across both apps.

**Alternatives considered**:

- Client-only export assembly: risks inconsistent access checks and duplicate
  logic.
- Static monthly export jobs only: conflicts with selected day and current
  partial month export requirements.

## Decision: V1 privacy level is private research MVP

**Rationale**: The user selected the recommended level for this workflow. V1 must
include consent, private storage, RLS, audit events, export controls, and deletion
request language, but it must not claim formal medical-device or formal
compliance certification.

**Alternatives considered**:

- GDPR-ready from day one: may be a future target but adds workflows beyond
  current V1 scope.
- Medical-grade compliance: requires policy, audit, process, and infrastructure
  work beyond this MVP.
