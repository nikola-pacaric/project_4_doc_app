do $$
begin
  if exists (
    select 1
    from public.exercise_details details
    join public.patient_entries entry on entry.id = details.entry_id
    where nullif(btrim(coalesce(details.activity, '')), '') is null
       or details.duration_minutes is null
       or details.duration_minutes not between 1 and 1440
       or details.intensity is null
       or details.intensity not in ('light', 'moderate', 'vigorous')
       or entry.kind <> 'exercise'
  ) then
    raise exception 'Cannot harden exercise data while invalid rows exist';
  end if;
end;
$$;

alter table public.exercise_details
  alter column activity set not null,
  alter column duration_minutes set not null,
  alter column intensity set not null;

alter table public.exercise_details
  drop constraint if exists exercise_details_duration_minutes_check,
  drop constraint if exists exercise_details_intensity_check,
  drop constraint if exists exercise_details_required_fields_check,
  drop constraint if exists exercise_details_activity_check;

alter table public.exercise_details
  add constraint exercise_details_activity_check
    check (nullif(btrim(activity), '') is not null),
  add constraint exercise_details_duration_minutes_check
    check (duration_minutes between 1 and 1440),
  add constraint exercise_details_intensity_check
    check (intensity in ('light', 'moderate', 'vigorous'));

create or replace function app_private.enforce_exercise_entry_kind()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actual_kind text;
begin
  select entry.kind
  into actual_kind
  from public.patient_entries entry
  where entry.id = new.entry_id;

  if actual_kind is distinct from 'exercise' then
    raise exception using
      errcode = '23514',
      message = 'exercise_details must reference a patient_entries row with kind exercise';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_exercise_entry_kind on public.exercise_details;
create trigger enforce_exercise_entry_kind
  before insert or update of entry_id on public.exercise_details
  for each row execute function app_private.enforce_exercise_entry_kind();

revoke all privileges on table public.exercise_details from anon, authenticated;
grant select, insert, update, delete on table public.exercise_details to authenticated;

alter table public.exercise_details enable row level security;

drop policy if exists "exercise_select_own_or_linked_doctor" on public.exercise_details;
create policy "exercise_select_own_or_linked_doctor"
  on public.exercise_details for select
  to authenticated
  using (app_private.patient_owns_entry(entry_id) or app_private.doctor_can_read_entry(entry_id));

drop policy if exists "exercise_insert_own" on public.exercise_details;
create policy "exercise_insert_own"
  on public.exercise_details for insert
  to authenticated
  with check (app_private.patient_owns_entry(entry_id));

drop policy if exists "exercise_update_own" on public.exercise_details;
create policy "exercise_update_own"
  on public.exercise_details for update
  to authenticated
  using (app_private.patient_owns_entry(entry_id))
  with check (app_private.patient_owns_entry(entry_id));

drop policy if exists "exercise_delete_own" on public.exercise_details;
create policy "exercise_delete_own"
  on public.exercise_details for delete
  to authenticated
  using (app_private.patient_owns_entry(entry_id));

create or replace function public.save_patient_exercise(
  p_entry_id uuid,
  p_occurred_at timestamptz,
  p_activity text,
  p_duration_minutes integer,
  p_intensity text,
  p_notes text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  patient_id_value uuid := (select auth.uid());
  exercise_entry_id uuid;
begin
  if patient_id_value is null or app_private.current_user_role() is distinct from 'patient' then
    raise exception using errcode = '42501', message = 'Only authenticated patients can save exercises';
  end if;

  if p_occurred_at is null then
    raise exception using errcode = '22023', message = 'Exercise time is required';
  end if;

  if nullif(btrim(coalesce(p_activity, '')), '') is null then
    raise exception using errcode = '22023', message = 'Exercise activity is required';
  end if;

  if p_duration_minutes is null or p_duration_minutes not between 1 and 1440 then
    raise exception using errcode = '22023', message = 'Exercise duration must be between 1 and 1440 minutes';
  end if;

  if p_intensity is null or p_intensity not in ('light', 'moderate', 'vigorous') then
    raise exception using errcode = '22023', message = 'Exercise intensity is invalid';
  end if;

  if p_entry_id is null then
    insert into public.patient_entries (patient_id, kind, occurred_at, text)
    values (patient_id_value, 'exercise', p_occurred_at, null)
    returning id into exercise_entry_id;
  else
    update public.patient_entries entry
    set occurred_at = p_occurred_at
    where entry.id = p_entry_id
      and entry.patient_id = patient_id_value
      and entry.kind = 'exercise'
    returning entry.id into exercise_entry_id;

    if exercise_entry_id is null then
      raise exception using errcode = '42501', message = 'Exercise entry is not editable by this patient';
    end if;
  end if;

  insert into public.exercise_details (
    entry_id,
    activity,
    duration_minutes,
    intensity,
    notes
  )
  values (
    exercise_entry_id,
    btrim(p_activity),
    p_duration_minutes,
    p_intensity,
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  on conflict (entry_id) do update
  set activity = excluded.activity,
      duration_minutes = excluded.duration_minutes,
      intensity = excluded.intensity,
      notes = excluded.notes;

  return exercise_entry_id;
end;
$$;

revoke execute on function public.save_patient_exercise(
  uuid,
  timestamptz,
  text,
  integer,
  text,
  text
) from public, anon;

grant execute on function public.save_patient_exercise(
  uuid,
  timestamptz,
  text,
  integer,
  text,
  text
) to authenticated;
