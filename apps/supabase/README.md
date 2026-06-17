# Supabase Workspace

This folder is reserved for the shared V1 backend.

Planned Phase 2 areas:

- `migrations/` for schema changes.
- `policies/` for RLS policy source notes when useful.
- `fixtures/` for test data.
- `tests/` for RLS and security validation.
- `functions/` for guarded backend functions when needed.

Security notes:

- Enable and test RLS on every exposed app table.
- Keep service-role credentials server-side only.
- Keep security-definer functions out of exposed schemas.
- Never embed base64 images in export JSON.
