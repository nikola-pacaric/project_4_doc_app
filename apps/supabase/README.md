# Supabase Workspace

This folder contains the shared V1 backend package and Supabase CLI project.

Primary areas:

- `supabase/config.toml` for Supabase CLI configuration.
- `supabase/migrations/` for schema changes.
- `supabase/functions/` for guarded backend functions when needed.
- `policies/` for RLS policy source notes when useful.
- `fixtures/` for test data.
- `tests/` for RLS and security validation.

Common commands from this folder:

```powershell
npm run migration:list
npm run db:push:dry
npm run rls:core
npm run rls:invites
npm run rls:photos
npm run types:generate
```

Regenerate the checked-in Supabase `Database` definitions after applying schema migrations. The
client adds only the nullable RPC-argument refinements that PostgreSQL accepts but the generator
does not encode.

Security notes:

- Enable and test RLS on every exposed app table.
- Keep service-role credentials server-side only.
- Keep security-definer functions out of exposed schemas.
- Never embed base64 images in export JSON.
