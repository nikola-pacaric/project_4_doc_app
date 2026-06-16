# Contracts: Medical Tracking Research MVP

This document describes programmer-facing service/RPC/API contracts. Exact transport may be Supabase client calls, Postgres RPC functions, REST endpoints, or framework server functions, but behavior and authorization must match these contracts.

## Auth and Profile Contract

### `get_current_profile`

Returns the authenticated user's profile, settings, and consent status.

Authorization:

- User can read only their own profile/settings.
- Role must come from trusted server-side profile/app metadata, not user-editable metadata.

Response fields:

- `user_id`
- `role`
- `patient_code`
- `app_language`
- `voice_language`
- `theme`
- `consent_required`
- `consent_version`

### `accept_consent`

Records consent acceptance.

Request fields:

- `consent_version`
- `language`
- `accepted_text_hash`

Validation:

- Authenticated user required.
- One acceptance per version is sufficient.

## Doctor Invite Code Contract

### `create_doctor_invite_code`

Doctor creates an invite code.

Request fields:

- Optional display label for doctor UI.

Response fields:

- `id`
- `code`
- `status`
- `expires_at`
- `max_uses`
- `used_count`

Rules:

- Only doctors can call.
- Code is single-use for MVP.
- Expiry is 7 days from creation.

### `revoke_doctor_invite_code`

Doctor revokes an unused invite code.

Request fields:

- `invite_code_id`

Rules:

- Only the creating doctor can revoke.
- Used codes cannot be revoked into reusable state.

### `redeem_doctor_invite_code`

Patient redeems an active code.

Request fields:

- `code`

Response fields:

- `doctor_patient_access_id`
- `doctor_id`
- `status`

Rules:

- Only patients can redeem.
- Redemption must be atomic.
- Expired, revoked, used, malformed, and over-use codes fail.
- Creates or reactivates active doctor-patient access only according to approved business rules.

## Patient Entry Contract

### `list_patient_entries`

Lists entries visible to the requester.

Request fields:

- `patient_id`
- `range_start`
- `range_end`
- Optional `include_hidden_state`

Rules:

- Patient can list own entries.
- Doctor can list entries only for active linked patients.
- Default patient UI excludes locally hidden/deleted items for that profile/device.
- Research/export flows can include retained items plus visibility state metadata.

### `create_patient_entry`

Creates a patient entry.

Request fields:

- `client_entry_uuid`
- `entry_type`
- `title`
- `note_text`
- `entry_timestamp`
- `custom_fields`
- `created_offline`
- `source_device_id`

Rules:

- Patient can create only their own entries.
- `(patient_id, client_entry_uuid)` is idempotent.
- Doctors cannot create patient entries in MVP.

### `update_patient_entry_timestamp`

Updates a patient entry timestamp.

Request fields:

- `entry_id`
- `entry_timestamp`

Rules:

- Patient can update own entry timestamp.
- Pending offline timestamp edits must sync to the retained row.
- Doctor cannot update patient entry timestamp.

## Local Visibility Contract

### `set_content_visibility_state`

Records local/profile/device hide/delete state without deleting research content.

Request fields:

- `content_type`: `entry` or `photo`
- `content_id`
- `scope`: `profile` or `device`
- `device_id` when scope is `device`
- `state`: `visible`, `hidden`, or `locally_deleted`
- Optional `reason`

Rules:

- User can set visibility state only for content they own or are allowed to manage locally.
- Operation must not delete database rows or storage objects during the research period.
- Exports include state metadata.

## Photo Contract

### `prepare_photo_upload`

Client-side behavior before upload:

- Preview selected/taken image.
- Resize max width to 1280px.
- Preserve aspect ratio.
- Convert/compress JPEG quality 0.8.
- Generate thumbnail.
- Reject if final file exceeds configured safe limit.

### `create_entry_photo_metadata`

Stores metadata after private storage upload.

Request fields:

- `entry_id`
- `storage_path`
- `thumbnail_path`
- `content_type`
- `width`
- `height`
- `main_size_bytes`
- `thumbnail_size_bytes`
- `label`
- `captured_at`

Rules:

- Patient can add photos to own entries while online.
- Doctor cannot add photos to patient entries in MVP.
- No base64 data accepted.
- Signed URLs are generated only when needed for display/export.

## Export Contract

### `generate_patient_export`

Doctor generates JSON export.

Request fields:

- `patient_id`
- `range_type`: `day` or `month`
- `selected_date` or `selected_month`
- `mode`: `all_data`, `all_data_with_images`, or `images_only_with_labels`
- Optional `include_doctor_notes`

Range rules:

- Day: selected date 00:00 to next day 00:00.
- Month: selected month start to the earlier of current date/time or month end.

Authorization:

- Doctor role required.
- Active doctor-patient access required.

Mode rules:

- `all_data`: patient code, date range, entries, timestamps, entry type, title, note text, custom fields, selected doctor notes, visibility states.
- `all_data_with_images`: all data plus photo metadata, signed image URLs, and thumbnail URLs when useful.
- `images_only_with_labels`: signed image URLs, image metadata, timestamp, entry label/title, entry type, and label only; no long notes or symptom descriptions.
- No export embeds base64 image data.

## RLS and Storage Policy Contract

- Enable RLS on every exposed table.
- Patients can read/write their own profile settings, entries, photos metadata, and local visibility states within allowed actions.
- Doctors can read linked patient data only through active `doctor_patient_access`.
- Doctors can create/read their own notes for active linked patients.
- Doctors can export only active linked patients.
- Invite code creation/revocation is restricted to the creating doctor.
- Invite code redemption is restricted to patient accounts and must be atomic.
- Private storage objects are readable only by owner patient or active linked doctor through signed URL generation rules.
- Public clients must never contain service-role or secret keys.
