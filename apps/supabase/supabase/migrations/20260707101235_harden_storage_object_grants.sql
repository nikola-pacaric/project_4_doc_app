-- Tighten project-owned Storage table grants while keeping documented Storage API operations available.
-- Supabase-managed grants from supabase_storage_admin may remain outside project-role control.

begin;

revoke all privileges on table storage.objects from public, anon, authenticated;
grant select, insert, update, delete on table storage.objects to authenticated;

commit;
