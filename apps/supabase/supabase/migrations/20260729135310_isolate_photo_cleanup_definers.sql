create or replace function app_private.list_pending_patient_photo_cleanups()
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

revoke execute on function app_private.list_pending_patient_photo_cleanups()
from public, anon;
grant execute on function app_private.list_pending_patient_photo_cleanups()
to authenticated;

create or replace function public.list_pending_patient_photo_cleanups()
returns table (
  job_id uuid,
  photo_id uuid,
  photo_path text,
  thumbnail_path text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from app_private.list_pending_patient_photo_cleanups();
$$;

revoke execute on function public.list_pending_patient_photo_cleanups()
from public, anon;
grant execute on function public.list_pending_patient_photo_cleanups()
to authenticated;

create or replace function app_private.complete_patient_photo_cleanups(p_job_ids uuid[])
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

revoke execute on function app_private.complete_patient_photo_cleanups(uuid[])
from public, anon;
grant execute on function app_private.complete_patient_photo_cleanups(uuid[])
to authenticated;

create or replace function public.complete_patient_photo_cleanups(p_job_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  select app_private.complete_patient_photo_cleanups(p_job_ids);
$$;

revoke execute on function public.complete_patient_photo_cleanups(uuid[])
from public, anon;
grant execute on function public.complete_patient_photo_cleanups(uuid[])
to authenticated;
