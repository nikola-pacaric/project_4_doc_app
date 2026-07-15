# Phase 7 Smoke Paths

Use these focused manual smoke paths for Phase 7 doctor linking and read-only dashboard validation. Record the result as user-verified, Codex-verified, or not run.

## Web

Status: user-verified on 2026-07-08. Doctor invite creation, patient redemption, used-code display, linked patient visibility, and linked timeline access worked in the web app.

1. Log in as a provisioned doctor.
2. Create a doctor invite code.
3. Log out, then log in as a patient.
4. Redeem the invite code from the patient timeline/home invite section.
5. Log back in as the doctor.
6. Confirm the linked patient appears in the doctor dashboard.
7. Open the linked patient timeline.
8. Confirm patient entries and supported photo thumbnails are readable.
9. Confirm there are no edit/delete controls for patient entries in the doctor timeline.

## Mobile/Android

Status: not run on device/emulator in this checkpoint; deferred to final mobile validation.

1. Log in as a provisioned doctor.
2. Create a doctor invite code.
3. Log out, then log in as a patient.
4. Redeem the invite code from the patient home invite section.
5. Log back in as the doctor.
6. Confirm the linked patient appears in the doctor dashboard.
7. Open the linked patient timeline.
8. Confirm patient entries and supported photo thumbnails are readable.
9. Confirm there are no edit/delete controls for patient entries in the doctor timeline.

## Automated Checks

- Shared Supabase client tests cover invite list/create/revoke/redeem wrappers and linked patient timeline reads.
- `apps/supabase/tests/rls_core_access.sql` covers unlinked/linked doctor patient access and read-only entry behavior.
- `apps/supabase/tests/rls_doctor_invites.sql` covers invite creation, revocation, redemption, invalid/reused/revoked/expired code rejection, one-active-doctor-per-patient enforcement, many-patients-per-doctor behavior, and access-row creation.
- `apps/supabase/tests/rls_photo_storage.sql` covers linked doctor photo metadata and storage-object reads.

## Relationship Cardinality

Status: not yet manually run as a complete multi-account smoke path.

1. Link Patient A to Doctor A with a valid invite.
2. Create an invite from Doctor B and confirm Patient A cannot redeem it while Doctor A remains active.
3. Create another invite from Doctor A and redeem it as Patient B.
4. Confirm Doctor A sees both Patient A and Patient B in the linked-patients list.
5. Confirm each patient sees only Doctor A as the active linked doctor.
