# Research: Medical Tracking Research MVP

## Decision: Authoritative Requirements Source

**Decision**: Apply direct user decisions first, then `Final MVP Decisions.pdf`, then `Product Development Plan.pdf`.

**Rationale**: The user explicitly stated this conflict order. It resolves conflicts around offline-lite, invite-code linking, Serbian UI, export modes, and data deletion.

**Alternatives considered**: Treating the older product plan as equal authority was rejected because it conflicts with final MVP decisions.

## Decision: Supabase Backend With RLS and Private Storage

**Decision**: Plan around Supabase Auth, Postgres, RLS, and private Storage.

**Rationale**: Intake documents refer to Supabase linking, Supabase Storage, RLS, and free-tier storage protection. RLS must enforce doctor-patient access and patient ownership.

**Alternatives considered**: Custom backend storage was not requested and would add scope for the MVP.

**Implementation note**: Before implementation, verify current Supabase Auth, RLS, Storage, and CLI guidance against current Supabase docs and changelog.

## Decision: Invite-Code Linking in MVP

**Decision**: Implement doctor-generated single-use invite codes for MVP.

**Rationale**: Final MVP decisions explicitly replace manual Supabase linking with invite-code linking.

**Alternatives considered**: Manual database linking was rejected for MVP because the final decision makes invite codes required.

## Decision: Offline-Lite, Not Full Offline

**Decision**: Support offline-lite text entry creation, cached own history, pending timestamp edits, visible pending sync, and retry sync.

**Rationale**: This meets the final MVP requirement while excluding expensive conflict resolution and unsupported offline photo/export flows.

**Alternatives considered**: Full offline parity was rejected as out of scope. Online-only was rejected because final decisions require offline-lite.

## Decision: No Hard Delete During Research

**Decision**: Preserve research rows and storage objects during the three-month research period. Model local hide/delete as tracked database state.

**Rationale**: The user explicitly required research data to remain in the database and both local state and research state to be trackable.

**Alternatives considered**: Physical delete and automatic cleanup were rejected for MVP. Cleanup/archive tooling is future work after research completion.

## Decision: Client-Side Photo Normalization

**Decision**: Resize to max width 1280px, JPEG quality 0.8, generate thumbnail, upload compressed image and thumbnail only, store paths/metadata only.

**Rationale**: Final MVP decisions require storage discipline for 3-5 users on Supabase free tier.

**Alternatives considered**: Uploading originals or storing base64 in Postgres was rejected.

## Decision: Doctor-Only JSON Exports

**Decision**: MVP exports are doctor-only and support selected day and selected month in three modes: All data, All data with images, Images only with labels.

**Rationale**: Final MVP decisions narrow the export scope and remove patient export buttons from MVP.

**Alternatives considered**: Weekly exports from the older product plan are superseded by final decisions.

## Decision: Free Device/Browser Voice Recognition

**Decision**: Use free device/browser speech recognition for reusable text input support; do not use paid AI transcription or store raw audio.

**Rationale**: Final decisions explicitly reject paid transcription APIs and raw audio storage.

**Alternatives considered**: OpenAI Whisper or other paid transcription services were rejected for MVP.

## Decision: Serbian and English UI From Start

**Decision**: Implement Serbian and English translation files, app language settings, voice language settings, and light/dark theme settings from the start.

**Rationale**: Final MVP decisions require Serbian UI in MVP and prohibit hardcoded UI strings.

**Alternatives considered**: English-only MVP from the older product plan is superseded.
