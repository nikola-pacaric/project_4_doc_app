begin;

-- Keep one definition of the Europe/Belgrade calendar-day boundary for RLS,
-- privileged RPC guards, and photo cleanup authorization.
create or replace function app_private.is_current_belgrade_day(value timestamptz)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select value is not null
    and value >= (
      pg_catalog.date_trunc('day', pg_catalog.now() at time zone 'Europe/Belgrade')
      at time zone 'Europe/Belgrade'
    )
    and value < (
      (
        pg_catalog.date_trunc('day', pg_catalog.now() at time zone 'Europe/Belgrade')
        + interval '1 day'
      ) at time zone 'Europe/Belgrade'
    );
$$;

revoke execute on function app_private.is_current_belgrade_day(timestamptz)
from public, anon;
grant execute on function app_private.is_current_belgrade_day(timestamptz)
to authenticated;

create or replace function app_private.patient_owns_current_day_entry(target_entry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.patient_entries entry
    where entry.id = target_entry_id
      and entry.patient_id = (select auth.uid())
      and app_private.is_current_belgrade_day(entry.occurred_at)
  );
$$;

revoke execute on function app_private.patient_owns_current_day_entry(uuid)
from public, anon;
grant execute on function app_private.patient_owns_current_day_entry(uuid)
to authenticated;

-- RLS covers direct and security-invoker writes. This trigger applies the same
-- invariant to the two narrowly privileged stool/note conversion RPCs.
create or replace function app_private.enforce_current_day_patient_entry_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id_value uuid := (select auth.uid());
begin
  if actor_id_value is null then
    return new;
  end if;

  if app_private.current_user_role() is distinct from 'patient'::public.user_role
    or old.patient_id is distinct from actor_id_value
    or new.patient_id is distinct from actor_id_value then
    raise exception using
      errcode = '42501',
      message = 'Only the owning patient can update this entry';
  end if;

  if old.id is distinct from new.id
    or old.patient_id is distinct from new.patient_id
    or old.client_entry_id is distinct from new.client_entry_id
    or old.created_at is distinct from new.created_at then
    raise exception using
      errcode = '42501',
      message = 'Patient entry identity fields are immutable';
  end if;

  if old.kind is distinct from new.kind
    and not (
      (
        old.kind = 'stool'::public.entry_kind
        and new.kind = 'note'::public.entry_kind
        and new.text = 'No stool today'
      )
      or (
        old.kind = 'note'::public.entry_kind
        and old.text = 'No stool today'
        and new.kind = 'stool'::public.entry_kind
        and new.text is null
      )
    ) then
    raise exception using
      errcode = '42501',
      message = 'Patient entry kind is immutable outside the stool answer conversion';
  end if;

  if not app_private.is_current_belgrade_day(old.occurred_at)
    or not app_private.is_current_belgrade_day(new.occurred_at) then
    raise exception using
      errcode = '42501',
      message = 'Patient entries can only be updated during their Europe/Belgrade calendar day';
  end if;

  return new;
end;
$$;

revoke execute on function app_private.enforce_current_day_patient_entry_update()
from public, anon, authenticated;

drop trigger if exists enforce_current_day_patient_entry_update
  on public.patient_entries;
create trigger enforce_current_day_patient_entry_update
  before update on public.patient_entries
  for each row execute function app_private.enforce_current_day_patient_entry_update();

drop policy if exists "entries_update_own" on public.patient_entries;
create policy "entries_update_own"
  on public.patient_entries for update
  to authenticated
  using (
    patient_id = (select auth.uid())
    and (select app_private.current_user_role()) = 'patient'::public.user_role
    and app_private.is_current_belgrade_day(occurred_at)
  )
  with check (
    patient_id = (select auth.uid())
    and (select app_private.current_user_role()) = 'patient'::public.user_role
    and app_private.is_current_belgrade_day(occurred_at)
  );

-- Direct Data API clients may edit only the two mutable parent fields. The RPCs
-- create rows with the other columns and the guarded conversions own kind changes.
revoke update on table public.patient_entries from authenticated;
grant update (occurred_at, text) on table public.patient_entries to authenticated;

alter function public.save_patient_note(uuid, timestamptz, text, text)
security definer;
alter function public.save_patient_note(uuid, timestamptz, text, text)
set search_path = '';

alter function public.save_patient_stool(
  uuid, timestamptz, integer, text, boolean, boolean, boolean, boolean, boolean, text
) security definer;
alter function public.save_patient_stool(
  uuid, timestamptz, integer, text, boolean, boolean, boolean, boolean, boolean, text
) set search_path = '';

revoke execute on function public.save_patient_note(uuid, timestamptz, text, text)
from public, anon;
grant execute on function public.save_patient_note(uuid, timestamptz, text, text)
to authenticated;

revoke execute on function public.save_patient_stool(
  uuid, timestamptz, integer, text, boolean, boolean, boolean, boolean, boolean, text
) from public, anon;
grant execute on function public.save_patient_stool(
  uuid, timestamptz, integer, text, boolean, boolean, boolean, boolean, boolean, text
) to authenticated;

-- Detail tables must close at the same day boundary as their parent entry.
alter policy "daily_update_own"
  on public.daily_form_details
  using (app_private.patient_owns_current_day_entry(entry_id))
  with check (app_private.patient_owns_current_day_entry(entry_id));

alter policy "food_form_update_own"
  on public.food_form_details
  using (app_private.patient_owns_current_day_entry(entry_id))
  with check (app_private.patient_owns_current_day_entry(entry_id));

alter policy "meal_update_own"
  on public.meal_details
  using (app_private.patient_owns_current_day_entry(entry_id))
  with check (app_private.patient_owns_current_day_entry(entry_id));

alter policy "symptom_update_own"
  on public.symptom_details
  using (app_private.patient_owns_current_day_entry(entry_id))
  with check (app_private.patient_owns_current_day_entry(entry_id));

alter policy "stool_update_own"
  on public.stool_details
  using (app_private.patient_owns_current_day_entry(entry_id))
  with check (app_private.patient_owns_current_day_entry(entry_id));

alter policy "medication_update_own"
  on public.medication_details
  using (app_private.patient_owns_current_day_entry(entry_id))
  with check (app_private.patient_owns_current_day_entry(entry_id));

alter policy "exercise_update_own"
  on public.exercise_details
  using (app_private.patient_owns_current_day_entry(entry_id))
  with check (app_private.patient_owns_current_day_entry(entry_id));

alter policy "menstruation_update_own"
  on public.menstruation_events
  using (app_private.patient_owns_current_day_entry(entry_id))
  with check (app_private.patient_owns_current_day_entry(entry_id));

alter policy "other_fluids_update_own"
  on public.other_fluid_details
  using (
    app_private.patient_owns_current_day_entry(daily_entry_id)
    and (
      entry_id is null
      or app_private.patient_owns_current_day_entry(entry_id)
    )
  )
  with check (
    app_private.patient_owns_current_day_entry(daily_entry_id)
    and (
      entry_id is null
      or app_private.patient_owns_current_day_entry(entry_id)
    )
  );

alter policy "photos_update_own"
  on public.entry_photos
  using (
    patient_id = (select auth.uid())
    and app_private.patient_owns_current_day_entry(entry_id)
  )
  with check (
    patient_id = (select auth.uid())
    and app_private.patient_owns_current_day_entry(entry_id)
  );

-- A valid current-day parent deletion cascades photo metadata before the client
-- calls the Storage API. Record only the exact paths and expire them promptly.
create table if not exists app_private.patient_photo_cleanup_authorizations (
  patient_id uuid not null,
  entry_id uuid not null,
  object_path text not null,
  created_at timestamptz not null default pg_catalog.now(),
  authorized_until timestamptz not null,
  primary key (patient_id, object_path),
  check (authorized_until > created_at)
);

alter table app_private.patient_photo_cleanup_authorizations
enable row level security;

revoke all privileges on table
  app_private.patient_photo_cleanup_authorizations
from public, anon, authenticated;

create index if not exists patient_photo_cleanup_authorizations_expiry_idx
  on app_private.patient_photo_cleanup_authorizations (authorized_until);

create or replace function app_private.authorize_current_day_photo_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is distinct from old.patient_id
    or app_private.current_user_role() is distinct from 'patient'::public.user_role
    or not app_private.is_current_belgrade_day(old.occurred_at) then
    return old;
  end if;

  delete from app_private.patient_photo_cleanup_authorizations cleanup_auth
  where cleanup_auth.authorized_until <= pg_catalog.now();

  insert into app_private.patient_photo_cleanup_authorizations (
    patient_id,
    entry_id,
    object_path,
    authorized_until
  )
  select
    old.patient_id,
    old.id,
    paths.object_path,
    pg_catalog.now() + interval '15 minutes'
  from public.entry_photos photo
  cross join lateral (
    values (photo.photo_path), (photo.thumbnail_path)
  ) as paths(object_path)
  where photo.entry_id = old.id
    and paths.object_path is not null
  on conflict (patient_id, object_path) do update
  set entry_id = excluded.entry_id,
      created_at = pg_catalog.now(),
      authorized_until = excluded.authorized_until;

  return old;
end;
$$;

revoke execute on function app_private.authorize_current_day_photo_cleanup()
from public, anon, authenticated;

drop trigger if exists authorize_current_day_photo_cleanup
  on public.patient_entries;
create trigger authorize_current_day_photo_cleanup
  before delete on public.patient_entries
  for each row execute function app_private.authorize_current_day_photo_cleanup();

create or replace function app_private.can_delete_entry_photo_metadata(target_photo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.entry_photos photo
    join public.patient_entries entry on entry.id = photo.entry_id
    where photo.id = target_photo_id
      and photo.patient_id = (select auth.uid())
      and entry.patient_id = photo.patient_id
      and app_private.is_current_belgrade_day(entry.occurred_at)
      and not exists (
        select 1
        from storage.objects object_row
        where object_row.bucket_id = 'patient-entry-photos'
          and object_row.name in (photo.photo_path, photo.thumbnail_path)
      )
  );
$$;

revoke execute on function app_private.can_delete_entry_photo_metadata(uuid)
from public, anon;
grant execute on function app_private.can_delete_entry_photo_metadata(uuid)
to authenticated;

drop policy if exists "photos_delete_own" on public.entry_photos;
create policy "photos_delete_own"
  on public.entry_photos for delete
  to authenticated
  using (app_private.can_delete_entry_photo_metadata(id));

create or replace function app_private.can_delete_patient_photo_object(
  target_bucket_id text,
  target_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and app_private.current_user_role() = 'patient'::public.user_role
    and target_bucket_id = 'patient-entry-photos'
    and pg_catalog.split_part(target_name, '/', 1) = 'patients'
    and pg_catalog.split_part(target_name, '/', 2) = (select auth.uid())::text
    and pg_catalog.split_part(target_name, '/', 3) = 'entries'
    and pg_catalog.split_part(target_name, '/', 5) in ('photos', 'thumbs')
    and target_name like 'patients/%/entries/%/%.jpg'
    and pg_catalog.split_part(target_name, '/', 7) = ''
    and target_name not like '%base64%'
    and (
      exists (
        select 1
        from public.entry_photos photo
        join public.patient_entries entry on entry.id = photo.entry_id
        where photo.patient_id = (select auth.uid())
          and entry.patient_id = photo.patient_id
          and app_private.is_current_belgrade_day(entry.occurred_at)
          and target_name in (photo.photo_path, photo.thumbnail_path)
      )
      or exists (
        select 1
        from app_private.patient_photo_cleanup_authorizations cleanup_auth
        where cleanup_auth.patient_id = (select auth.uid())
          and cleanup_auth.object_path = target_name
          and cleanup_auth.authorized_until > pg_catalog.now()
      )
    );
$$;

revoke execute on function app_private.can_delete_patient_photo_object(text, text)
from public, anon;
grant execute on function app_private.can_delete_patient_photo_object(text, text)
to authenticated;

drop policy if exists "patient_photo_objects_delete_own_metadata"
  on storage.objects;
create policy "patient_photo_objects_delete_own_metadata"
  on storage.objects for delete
  to authenticated
  using (
    app_private.can_delete_patient_photo_object(bucket_id, name)
  );

commit;
