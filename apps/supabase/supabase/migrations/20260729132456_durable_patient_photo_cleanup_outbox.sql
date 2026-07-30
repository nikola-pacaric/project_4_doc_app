create table if not exists app_private.patient_photo_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  photo_id uuid not null,
  entry_id uuid not null,
  photo_path text not null,
  thumbnail_path text not null,
  created_at timestamptz not null default pg_catalog.now(),
  unique (patient_id, photo_id),
  check (
    photo_path = pg_catalog.concat(
      'patients/', patient_id::text, '/entries/', entry_id::text,
      '/photos/', pg_catalog.split_part(photo_path, '/', 6)
    )
    and thumbnail_path = pg_catalog.concat(
      'patients/', patient_id::text, '/entries/', entry_id::text,
      '/thumbs/', pg_catalog.split_part(thumbnail_path, '/', 6)
    )
    and photo_path like 'patients/%/entries/%/photos/%.jpg'
    and thumbnail_path like 'patients/%/entries/%/thumbs/%.jpg'
    and pg_catalog.split_part(photo_path, '/', 7) = ''
    and pg_catalog.split_part(thumbnail_path, '/', 7) = ''
    and photo_path not like '%base64%'
    and thumbnail_path not like '%base64%'
  )
);

alter table app_private.patient_photo_cleanup_jobs enable row level security;

revoke all privileges on table app_private.patient_photo_cleanup_jobs
from public, anon, authenticated;

create index if not exists patient_photo_cleanup_jobs_patient_created_idx
  on app_private.patient_photo_cleanup_jobs (patient_id, created_at, id);

create or replace function app_private.enqueue_patient_photo_cleanups(
  p_photo_ids uuid[],
  p_day_start timestamptz,
  p_day_end timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient_id uuid := (select auth.uid());
begin
  if v_patient_id is null
     or app_private.current_user_role() is distinct from 'patient'::public.user_role then
    raise exception using errcode = '42501', message = 'Only authenticated patients can queue photo cleanup';
  end if;

  if p_day_start is null
     or p_day_end is null
     or p_day_start >= p_day_end
     or p_day_end - p_day_start > interval '26 hours' then
    raise exception using errcode = '22023', message = 'Invalid photo cleanup day range';
  end if;

  if coalesce(pg_catalog.cardinality(p_photo_ids), 0) = 0 then
    return;
  end if;

  if pg_catalog.cardinality(p_photo_ids) > 64
     or pg_catalog.array_position(p_photo_ids, null::uuid) is not null then
    raise exception using errcode = '22023', message = 'Invalid photo cleanup request';
  end if;

  if exists (
    select 1
    from (
      select distinct requested.photo_id
      from pg_catalog.unnest(p_photo_ids) as requested(photo_id)
    ) requested
    left join public.entry_photos photo on photo.id = requested.photo_id
    left join public.patient_entries entry on entry.id = photo.entry_id
    where photo.id is null
       or photo.patient_id is distinct from v_patient_id
       or entry.patient_id is distinct from v_patient_id
       or entry.kind::text not in ('daily', 'meal', 'fluid')
       or entry.occurred_at < p_day_start
       or entry.occurred_at >= p_day_end
       or not app_private.is_current_belgrade_day(entry.occurred_at)
  ) then
    raise exception using errcode = '42501', message = 'One or more photos are not editable for this tracked day';
  end if;

  insert into app_private.patient_photo_cleanup_jobs (
    patient_id,
    photo_id,
    entry_id,
    photo_path,
    thumbnail_path
  )
  select
    photo.patient_id,
    photo.id,
    photo.entry_id,
    photo.photo_path,
    photo.thumbnail_path
  from public.entry_photos photo
  where photo.patient_id = v_patient_id
    and photo.id = any(p_photo_ids)
  on conflict (patient_id, photo_id) do update
  set entry_id = excluded.entry_id,
      photo_path = excluded.photo_path,
      thumbnail_path = excluded.thumbnail_path,
      created_at = pg_catalog.now();
end;
$$;

revoke execute on function app_private.enqueue_patient_photo_cleanups(
  uuid[], timestamptz, timestamptz
) from public, anon;
grant execute on function app_private.enqueue_patient_photo_cleanups(
  uuid[], timestamptz, timestamptz
) to authenticated;

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

  insert into app_private.patient_photo_cleanup_jobs (
    patient_id,
    photo_id,
    entry_id,
    photo_path,
    thumbnail_path
  )
  select
    old.patient_id,
    photo.id,
    old.id,
    photo.photo_path,
    photo.thumbnail_path
  from public.entry_photos photo
  where photo.entry_id = old.id
  on conflict (patient_id, photo_id) do update
  set entry_id = excluded.entry_id,
      photo_path = excluded.photo_path,
      thumbnail_path = excluded.thumbnail_path,
      created_at = pg_catalog.now();

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
      or exists (
        select 1
        from app_private.patient_photo_cleanup_jobs cleanup_job
        where cleanup_job.patient_id = (select auth.uid())
          and target_name in (cleanup_job.photo_path, cleanup_job.thumbnail_path)
      )
    );
$$;

revoke execute on function app_private.can_delete_patient_photo_object(text, text)
from public, anon;
grant execute on function app_private.can_delete_patient_photo_object(text, text)
to authenticated;

create or replace function public.list_pending_patient_photo_cleanups()
returns table (
  job_id uuid,
  photo_id uuid,
  photo_path text,
  thumbnail_path text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_patient_id uuid := (select auth.uid());
begin
  if v_patient_id is null
     or app_private.current_user_role() is distinct from 'patient'::public.user_role then
    raise exception using errcode = '42501', message = 'Only authenticated patients can list photo cleanup';
  end if;

  return query
  select
    cleanup_job.id,
    cleanup_job.photo_id,
    cleanup_job.photo_path,
    cleanup_job.thumbnail_path
  from app_private.patient_photo_cleanup_jobs cleanup_job
  where cleanup_job.patient_id = v_patient_id
  order by cleanup_job.created_at, cleanup_job.id
  limit 100;
end;
$$;

revoke execute on function public.list_pending_patient_photo_cleanups()
from public, anon;
grant execute on function public.list_pending_patient_photo_cleanups()
to authenticated;

create or replace function public.complete_patient_photo_cleanups(p_job_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient_id uuid := (select auth.uid());
begin
  if v_patient_id is null
     or app_private.current_user_role() is distinct from 'patient'::public.user_role then
    raise exception using errcode = '42501', message = 'Only authenticated patients can complete photo cleanup';
  end if;

  if coalesce(pg_catalog.cardinality(p_job_ids), 0) = 0 then
    return;
  end if;

  if pg_catalog.cardinality(p_job_ids) > 100
     or pg_catalog.array_position(p_job_ids, null::uuid) is not null then
    raise exception using errcode = '22023', message = 'Invalid photo cleanup completion';
  end if;

  if exists (
    select 1
    from (
      select distinct requested.job_id
      from pg_catalog.unnest(p_job_ids) as requested(job_id)
    ) requested
    left join app_private.patient_photo_cleanup_jobs cleanup_job
      on cleanup_job.id = requested.job_id
    where cleanup_job.id is null
       or cleanup_job.patient_id is distinct from v_patient_id
  ) then
    raise exception using errcode = '42501', message = 'One or more cleanup jobs are not available';
  end if;

  if exists (
    select 1
    from app_private.patient_photo_cleanup_jobs cleanup_job
    join storage.objects object_row
      on object_row.bucket_id = 'patient-entry-photos'
     and object_row.name in (cleanup_job.photo_path, cleanup_job.thumbnail_path)
    where cleanup_job.patient_id = v_patient_id
      and cleanup_job.id = any(p_job_ids)
  ) then
    raise exception using errcode = '55000', message = 'Photo objects must be removed before cleanup completion';
  end if;

  delete from public.entry_photos photo
  using app_private.patient_photo_cleanup_jobs cleanup_job
  where cleanup_job.patient_id = v_patient_id
    and cleanup_job.id = any(p_job_ids)
    and photo.id = cleanup_job.photo_id
    and photo.patient_id = v_patient_id;

  delete from app_private.patient_photo_cleanup_jobs cleanup_job
  where cleanup_job.patient_id = v_patient_id
    and cleanup_job.id = any(p_job_ids);
end;
$$;

revoke execute on function public.complete_patient_photo_cleanups(uuid[])
from public, anon;
grant execute on function public.complete_patient_photo_cleanups(uuid[])
to authenticated;

create or replace function public.save_patient_food_form_with_photo_cleanup(
  p_day_start timestamptz,
  p_day_end timestamptz,
  p_occurred_at timestamptz,
  p_water_liters numeric,
  p_has_other_fluids boolean,
  p_other_fluids text,
  p_meals jsonb,
  p_delete_photo_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_daily_entry_id uuid;
begin
  perform app_private.enqueue_patient_photo_cleanups(
    p_delete_photo_ids,
    p_day_start,
    p_day_end
  );

  v_daily_entry_id := public.save_patient_food_form(
    p_day_start,
    p_day_end,
    p_occurred_at,
    p_water_liters,
    p_has_other_fluids,
    p_other_fluids,
    p_meals
  );

  return v_daily_entry_id;
end;
$$;

revoke execute on function public.save_patient_food_form_with_photo_cleanup(
  timestamptz,
  timestamptz,
  timestamptz,
  numeric,
  boolean,
  text,
  jsonb,
  uuid[]
) from public, anon;

grant execute on function public.save_patient_food_form_with_photo_cleanup(
  timestamptz,
  timestamptz,
  timestamptz,
  numeric,
  boolean,
  text,
  jsonb,
  uuid[]
) to authenticated;
