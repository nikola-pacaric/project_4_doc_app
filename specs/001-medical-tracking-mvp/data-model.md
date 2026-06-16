# Data Model: Medical Tracking Research MVP

## Entity Overview

The model separates identity, access, patient-created research data, doctor annotations, media metadata, local visibility state, and export auditing. Physical deletion of research data is forbidden during the research period.

## Tables / Records

### profiles

- `id`: UUID, references authenticated user id.
- `role`: enum `patient` or `doctor`; immutable in MVP.
- `patient_code`: short research-safe code for patient exports; nullable for doctors.
- `display_name`: optional user-facing name.
- `created_at`, `updated_at`.

Rules:

- One account has one role.
- Authorization must not depend on user-editable metadata.

### user_settings

- `id`: UUID.
- `user_id`: UUID.
- `app_language`: enum `sr` or `en`.
- `voice_language`: enum `sr-RS` or `en-US`.
- `theme`: enum `light`, `dark`, optionally `system` later.
- `created_at`, `updated_at`.

Rules:

- UI language and voice language are separate settings.
- UI text must be loaded from translation resources.

### consent_acceptances

- `id`: UUID.
- `user_id`: UUID.
- `consent_version`: text.
- `language`: enum `sr` or `en`.
- `accepted_at`: timestamp.
- `accepted_text_hash`: text.

Rules:

- Users cannot proceed to normal app use until consent is accepted.
- Consent wording must include research testing, no diagnosis, data types, doctor review, exports, and data deletion requests.

### doctor_invite_codes

- `id`: UUID.
- `doctor_id`: UUID.
- `code`: short unique code.
- `status`: enum `active`, `revoked`, `used`, `expired`.
- `expires_at`: timestamp, default created_at + 7 days.
- `max_uses`: integer, `1` for MVP.
- `used_count`: integer.
- `created_at`: timestamp.
- `used_at`: timestamp nullable.
- `revoked_at`: timestamp nullable.
- `used_by_patient_id`: UUID nullable.

Rules:

- Code is single-use for MVP.
- Doctor can revoke before use.
- Redemption must atomically validate status, expiry, and use count.

### doctor_patient_access

- `id`: UUID.
- `doctor_id`: UUID.
- `patient_id`: UUID.
- `status`: enum `active`, `revoked`.
- `created_at`: timestamp.
- `revoked_at`: timestamp nullable.
- `created_by_invite_code_id`: UUID.

Rules:

- Doctor can view only rows for patients with active access.
- Patient should be able to revoke access after linking.

### patient_entries

- `id`: UUID.
- `patient_id`: UUID.
- `client_entry_uuid`: UUID generated on client for idempotent offline sync.
- `entry_type`: enum `meal`, `symptom`, `medication`, `exercise`, `daily_note`, `custom`.
- `title`: text.
- `note_text`: text.
- `entry_timestamp`: timestamp selected/edited by patient.
- `custom_fields`: JSON object.
- `created_offline`: boolean.
- `source_device_id`: text nullable.
- `synced_at`: timestamp nullable.
- `created_at`, `updated_at`.

Rules:

- Patient owns entries.
- Doctors can read linked patient entries but cannot edit/delete them in MVP.
- Unique `(patient_id, client_entry_uuid)` prevents duplicate sync.

### entry_photos

- `id`: UUID.
- `entry_id`: UUID.
- `patient_id`: UUID.
- `storage_path`: text for compressed main image.
- `thumbnail_path`: text.
- `content_type`: `image/jpeg`.
- `width`, `height`: integers.
- `main_size_bytes`, `thumbnail_size_bytes`: integers.
- `label`: text, e.g. Breakfast, Lunch, Dinner, Snack, Symptom photo, Burn, Rash, Other.
- `captured_at`: timestamp nullable.
- `uploaded_at`: timestamp.
- `created_at`.

Rules:

- No original full-size image is uploaded.
- No base64 image data is stored in Postgres.
- Storage bucket is private.

### doctor_notes

- `id`: UUID.
- `doctor_id`: UUID.
- `patient_id`: UUID.
- `entry_id`: UUID nullable.
- `note_text`: text.
- `created_at`, `updated_at`.

Rules:

- Doctor notes are separate from patient entries.
- Doctor notes require active doctor-patient access.

### user_content_visibility_states

- `id`: UUID.
- `user_id`: UUID acting user.
- `content_type`: enum `entry`, `photo`.
- `content_id`: UUID.
- `scope`: enum `profile`, `device`.
- `device_id`: text nullable.
- `state`: enum `visible`, `hidden`, `locally_deleted`.
- `reason`: optional text.
- `created_at`.

Rules:

- Hiding or locally deleting content creates or updates a visibility state.
- Underlying research rows and storage objects remain retained during the research period.
- Exports include visibility state metadata when content is retained but hidden/deleted locally.

### export_audit_events

- `id`: UUID.
- `doctor_id`: UUID.
- `patient_id`: UUID.
- `range_type`: enum `day`, `month`.
- `range_start`, `range_end`: timestamps.
- `mode`: enum `all_data`, `all_data_with_images`, `images_only_with_labels`.
- `created_at`: timestamp.
- `status`: enum `requested`, `generated`, `failed`.

Rules:

- Exports are generated on demand.
- Export audit rows help trace research data access.

### storage_usage_estimates

- `id`: UUID.
- `user_id`: UUID nullable.
- `scope`: enum `project`, `user`.
- `estimated_bytes`: integer.
- `warning_threshold_bytes`: integer.
- `updated_at`.

Rules:

- Used for warnings and upload protection.
- Hard enforcement also belongs at storage/upload validation.

## State Transitions

### Invite Code

`active -> used` after successful redemption.

`active -> revoked` when doctor revokes before use.

`active -> expired` when current time is after `expires_at`.

### Doctor Patient Access

`active -> revoked` when patient revokes access or an administrator/research owner performs an approved revocation.

### Entry Sync

Local-only pending entry -> synced `patient_entries` row with `synced_at`.

Retry with same `client_entry_uuid` -> no duplicate row.

### Content Visibility

Default visible -> hidden -> visible is allowed for local/profile state.

Default visible or hidden -> locally_deleted hides from default UI but retains database/storage records.

Physical deletion during research period is not allowed.
