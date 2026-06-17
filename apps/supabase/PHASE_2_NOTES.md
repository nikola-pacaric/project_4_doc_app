# Phase 2 Supabase Notes

Project ref: `kmfbwnjaodjtdynwrqxu`

Phase 2 creates the secure backend foundation:

- Core tables for profiles, baseline, entries, detail forms, photos, invites, doctor-patient access, exports, and audit events.
- Immutable account roles.
- Patient-owned data rules.
- Linked-doctor read rules.
- Doctor read-only timeline behavior.
- Explicit grants for authenticated users because new Supabase projects may not expose new tables to the Data API automatically.
- RLS enabled on all public app tables.

## Security Choices

- Client apps use publishable Supabase keys only.
- Service-role and secret keys are not stored in this repository.
- Public functions are `security invoker`.
- Privileged helper functions live in `app_private`, not in the exposed `public` schema.
- Export payloads are checked to reject embedded base64 image markers.
- The Auth signup trigger creates patient profiles by default and only creates doctor profiles when admin-controlled `raw_app_meta_data.app_role = 'doctor'`.
- Advisor fixes set stable function search paths and add covering indexes for foreign keys used by access/export/photo tables.

## Verification

Run `tests/rls_core_access.sql` against the database to verify:

- Patient A cannot see or update Patient B entries.
- Unlinked doctors cannot see patient entries.
- Linked doctors can read linked patient entries.
- Linked doctors still cannot update patient entries.
