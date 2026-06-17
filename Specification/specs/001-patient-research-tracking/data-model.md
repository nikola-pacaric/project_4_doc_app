# Data Model: V1 Patient Research Tracking App

## Overview

The data model supports patient-owned research tracking, manually provisioned
doctors, invite-code linking, complete V1 forms, offline-lite text sync, private
photos, and doctor-only exports. Names below are proposed logical table/entity
names for implementation planning.

## Entities

### user_profiles

Represents one authenticated account and app-level settings.

| Field | Type | Rules |
|-------|------|-------|
| id | uuid | Primary key; equals authenticated user id |
| role | enum | `patient` or `doctor`; immutable after creation |
| display_name | text | Optional |
| app_language | enum | `sr` or `en`; default based on implementation decision |
| voice_language | enum | `sr-RS` or `en-US` |
| theme | enum | `light`, `dark`, future `system` optional |
| consent_accepted_at | timestamptz | Required before app workflows |
| consent_version | text | Required with consent |
| created_at | timestamptz | Required |
| updated_at | timestamptz | Required |

Relationships:

- One `user_profiles` row may have one `patient_baseline_profiles` row when
  role is patient.
- Doctor rows link to patients through `doctor_patient_access`.

Validation:

- Public signup may create only patient profiles.
- Doctor profiles are manually created/admin-controlled in V1.
- Role cannot be changed by the client.

### patient_baseline_profiles

Represents patient baseline information collected at onboarding and editable
later.

| Field | Type | Rules |
|-------|------|-------|
| id | uuid | Primary key |
| patient_id | uuid | Unique, references patient `user_profiles.id` |
| sex | enum/text | Required if patient provides; allow non-answer if chosen by product |
| birth_year | integer | Required; validate reasonable range |
| occupation | text | Optional |
| chronic_diseases | text/json | Optional list or text |
| chronic_therapy | text/json | Optional list or text |
| menstrual_history | text/json | Optional; relevant for women where available |
| weight_kg | numeric | Optional numeric; validate positive |
| height_cm | numeric | Optional numeric; validate positive |
| major_weight_change_last_6_months | boolean | Required at baseline |
| major_weight_change_amount_kg | numeric | Required when previous field is true |
| last_weight_prompt_at | timestamptz | Used for three-month reminder |
| created_at | timestamptz | Required |
| updated_at | timestamptz | Required |

### patient_entries

Canonical patient-owned timeline entry.

| Field | Type | Rules |
|-------|------|-------|
| id | uuid | Primary key |
| patient_id | uuid | References patient `user_profiles.id` |
| entry_type | enum | `meal`, `symptom`, `medication`, `exercise`, `daily_note`, `custom`, `daily_form`, `stool`, `menstruation`, `nap` |
| title | text | Required; may be generated from type |
| note_text | text | Optional |
| occurred_at | timestamptz | Required; user-editable timestamp |
| created_at | timestamptz | Required; actual creation time |
| updated_at | timestamptz | Required |
| custom_fields | jsonb | Optional extra fields by category |
| source_client | enum | `web`, `android` |
| sync_state | enum | Server rows are `synced`; local-only pending rows are not stored here |

Validation:

- Patient can insert/update/delete only own entries.
- Doctor can select linked patient entries but cannot update/delete them.
- Entries sort by `occurred_at` for timelines and exports.

### daily_form_details

Structured one-day research fields. May be represented as one daily entry with
this detail row or normalized into multiple entries, but the contract requires
these fields.

| Field | Type | Rules |
|-------|------|-------|
| entry_id | uuid | Primary key; references `patient_entries.id` |
| wake_time | time | Optional |
| appetite | enum | `good`, `bad`, optional |
| water_amount | numeric/text | Supports total or per-drink entry strategy |
| other_fluids | jsonb | Coffee, juice, energy drink, other |
| physical_activity | jsonb | Type and duration |
| sleep_hours | numeric | Previous night |
| sleep_quality | enum/text | Required when sleep entered |
| stress_level | integer | 0-5 |
| stress_description | text | Optional |
| day_description | text | Workday, shift, weekend, travel, other |
| medication_outside_chronic | boolean | Required in daily form |
| medication_notes | text | Required/optional based on answer |
| general_energy | enum | happy/neutral/sad or equivalent |
| naps | jsonb | Start/end ranges when present |

### meal_details

| Field | Type | Rules |
|-------|------|-------|
| entry_id | uuid | Primary key; references meal entry |
| meal_label | enum/text | Breakfast, lunch, dinner, snack, custom |
| description | text | Optional |
| photo_required | boolean | false; photo optional |

### symptom_details

| Field | Type | Rules |
|-------|------|-------|
| entry_id | uuid | Primary key; references symptom entry |
| symptom_type | enum/text | Intake symptom list plus `other` |
| started_at | timestamptz | Required when symptom selected |
| ended_at | timestamptz | Optional; must be after start when present |
| intensity | integer | 1-3 |
| quality_of_life_impact | text/enum | Required |
| modifying_factors | text | Optional |
| woke_from_sleep | boolean | Required |
| pain_location | text/json | Required for pain |
| pain_radiation | text | Optional for pain |
| pain_description | text | Optional/custom |
| other_description | text | Required for `other` when no predefined option fits |

### stool_details

| Field | Type | Rules |
|-------|------|-------|
| entry_id | uuid | Primary key; references stool entry or daily form entry |
| had_stool | boolean | Required |
| bristol_type | integer | 1-7 when had_stool is true |
| urgency | boolean | Optional/required when stool present |
| pain | boolean | Optional/required when stool present |
| mucus | boolean | Optional/required when stool present |
| blood | boolean | Optional/required when stool present |
| fatty_stool | boolean | Optional/required when stool present |
| black_stool | boolean | Optional/required when stool present |

### medication_details

| Field | Type | Rules |
|-------|------|-------|
| entry_id | uuid | Primary key; references medication entry |
| medication_name | text | Required |
| dose | text | Optional |
| taken_at | timestamptz | Optional; defaults from entry timestamp |
| outside_chronic_therapy | boolean | Required |
| notes | text | Optional |

### exercise_details

| Field | Type | Rules |
|-------|------|-------|
| entry_id | uuid | Primary key; references exercise entry |
| activity_type | text | Required |
| duration_minutes | integer | Optional; positive |
| intensity | text/enum | Optional |
| notes | text | Optional |

### menstruation_events

| Field | Type | Rules |
|-------|------|-------|
| id | uuid | Primary key |
| patient_id | uuid | References patient |
| started_at | date/timestamptz | Required |
| ended_at | date/timestamptz | Optional; must be after start |
| notes | text | Optional |
| created_at | timestamptz | Required |

### entry_photos

Compressed photo metadata linked to an entry.

| Field | Type | Rules |
|-------|------|-------|
| id | uuid | Primary key |
| entry_id | uuid | References `patient_entries.id` |
| patient_id | uuid | Denormalized owner for policies |
| storage_path | text | Private main image path |
| thumbnail_path | text | Private thumbnail path |
| original_filename | text | Optional |
| mime_type | text | Must be JPEG for V1 uploads |
| width | integer | Main image width <= 1280 |
| height | integer | Positive |
| file_size_bytes | integer | Must be under configured safe limit |
| thumbnail_size_bytes | integer | Optional |
| label | text | Meal/symptom/custom label for images-only export |
| captured_at | timestamptz | Optional if available |
| uploaded_at | timestamptz | Required |

Validation:

- Do not store base64 image data.
- Do not upload original full-resolution image.
- Upload only after client compression and thumbnail generation.

### doctor_invite_codes

| Field | Type | Rules |
|-------|------|-------|
| id | uuid | Primary key |
| doctor_id | uuid | References doctor `user_profiles.id` |
| code | text | Short, unique while active |
| status | enum | `active`, `used`, `revoked`, `expired` |
| expires_at | timestamptz | Created + 7 days |
| max_uses | integer | 1 for MVP |
| used_count | integer | 0 or 1 |
| created_at | timestamptz | Required |
| used_at | timestamptz | Set when used |

State transitions:

- `active` -> `used`
- `active` -> `revoked`
- `active` -> `expired`

### doctor_patient_access

| Field | Type | Rules |
|-------|------|-------|
| id | uuid | Primary key |
| doctor_id | uuid | References doctor |
| patient_id | uuid | References patient |
| status | enum | `active`, `revoked` |
| created_at | timestamptz | Required |
| revoked_at | timestamptz | Required when revoked |

Validation:

- Doctor can view only active linked patients.
- Doctor cannot update/delete patient entries.
- Patient revocation UI is future scope, but revoked rows must be respected.

### export_requests

Optional persistent audit record for doctor exports.

| Field | Type | Rules |
|-------|------|-------|
| id | uuid | Primary key |
| doctor_id | uuid | References doctor |
| patient_id | uuid | References linked patient |
| range_type | enum | `day`, `month` |
| range_start | timestamptz | Required |
| range_end | timestamptz | Required |
| mode | enum | `all_data`, `all_data_with_images`, `images_only_with_labels` |
| status | enum | `created`, `failed` |
| created_at | timestamptz | Required |
| error_message | text | Optional |

### audit_events

| Field | Type | Rules |
|-------|------|-------|
| id | uuid | Primary key |
| actor_id | uuid | Authenticated user |
| actor_role | enum | `patient`, `doctor`, `admin/system` |
| event_type | enum | consent, invite, link, export, denied_access, photo_upload, sync |
| patient_id | uuid | Optional related patient |
| metadata | jsonb | No raw audio; no base64 photo data |
| created_at | timestamptz | Required |

### local_pending_entries

Client-local entity, not a server table. Each app may implement it in a platform
appropriate local store.

| Field | Type | Rules |
|-------|------|-------|
| local_id | string | Primary key on device |
| patient_id | uuid | Current patient |
| entry_type | enum | Text-capable entry type only |
| title | text | Required |
| note_text | text | Optional |
| occurred_at | timestamptz | Editable while pending |
| custom_fields | json | Optional |
| created_locally_at | timestamptz | Required |
| sync_attempts | integer | Required |
| last_sync_error | text | Optional |
| status | enum | `pending`, `syncing`, `failed`, `synced` |

## Access Rules Summary

- Patients can select, insert, update, and delete their own profile, baseline,
  entries, details, and photos.
- Patients can read active doctor access links involving themselves.
- Doctors can select active linked patients, patient profiles needed for
  dashboard display, entries, details, and photos for linked patients.
- Doctors cannot insert/update/delete patient entries or photos.
- Doctors can create invite codes for themselves and revoke unused active codes.
- Doctors can create export requests and generated export packages only for
  linked active patients.
- Unauthenticated users cannot access app data.
- Service/admin operations must not be exposed in client code.

## Export Date Rules

- Day export: selected date at 00:00 inclusive to next day 00:00 exclusive.
- Month export: selected month start inclusive to the lesser of current date/time
  or month end exclusive.
- Export entries sorted by `occurred_at`, then stable id.

## Retention Rules

- No automatic deletion during the three-month research period.
- Monthly export/archive is allowed.
- Cleanup/archive deletion tooling is future scope after the research period.
