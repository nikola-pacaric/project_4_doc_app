do $$
begin
  if exists (
    select 1
    from public.stool_details details
    join public.patient_entries entry on entry.id = details.entry_id
    where details.bristol_type is null
       or details.bristol_type not between 1 and 7
       or details.urgency is null
       or details.urgency_level is null
       or details.urgency_level not in ('none', 'mild', 'moderate', 'severe')
       or details.urgency <> (details.urgency_level <> 'none')
       or details.pain is null
       or details.mucus is null
       or details.blood is null
       or details.fatty_stool is null
       or details.black_stool is null
       or entry.kind <> 'stool'
  ) then
    raise exception 'Cannot harden stool data while invalid rows exist';
  end if;
end;
$$;

alter table public.stool_details
  alter column bristol_type set not null,
  alter column urgency set not null,
  alter column urgency_level set not null,
  alter column pain set not null,
  alter column mucus set not null,
  alter column blood set not null,
  alter column fatty_stool set not null,
  alter column black_stool set not null;

alter table public.stool_details
  drop constraint if exists stool_details_bristol_type_check,
  drop constraint if exists stool_details_urgency_level_check,
  drop constraint if exists stool_details_required_fields_check,
  drop constraint if exists stool_details_urgency_consistency_check;

alter table public.stool_details
  add constraint stool_details_bristol_type_check
    check (bristol_type between 1 and 7),
  add constraint stool_details_urgency_level_check
    check (urgency_level in ('none', 'mild', 'moderate', 'severe')),
  add constraint stool_details_urgency_consistency_check
    check (urgency = (urgency_level <> 'none'));

create or replace function app_private.enforce_stool_entry_kind()
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

  if actual_kind is distinct from 'stool' then
    raise exception using
      errcode = '23514',
      message = 'stool_details must reference a patient_entries row with kind stool';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_stool_entry_kind on public.stool_details;
create trigger enforce_stool_entry_kind
  before insert or update of entry_id on public.stool_details
  for each row execute function app_private.enforce_stool_entry_kind();

revoke all privileges on table public.stool_details from anon, authenticated;
grant select, insert, update, delete on table public.stool_details to authenticated;

alter table public.stool_details enable row level security;

drop policy if exists "stool_select_own_or_linked_doctor" on public.stool_details;
create policy "stool_select_own_or_linked_doctor"
  on public.stool_details for select
  to authenticated
  using (app_private.patient_owns_entry(entry_id) or app_private.doctor_can_read_entry(entry_id));

drop policy if exists "stool_insert_own" on public.stool_details;
create policy "stool_insert_own"
  on public.stool_details for insert
  to authenticated
  with check (app_private.patient_owns_entry(entry_id));

drop policy if exists "stool_update_own" on public.stool_details;
create policy "stool_update_own"
  on public.stool_details for update
  to authenticated
  using (app_private.patient_owns_entry(entry_id))
  with check (app_private.patient_owns_entry(entry_id));

drop policy if exists "stool_delete_own" on public.stool_details;
create policy "stool_delete_own"
  on public.stool_details for delete
  to authenticated
  using (app_private.patient_owns_entry(entry_id));

create or replace function public.save_patient_stool(
  p_entry_id uuid,
  p_occurred_at timestamptz,
  p_bristol_type integer,
  p_urgency_level text,
  p_pain boolean,
  p_mucus boolean,
  p_blood boolean,
  p_fatty_stool boolean,
  p_black_stool boolean,
  p_notes text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  patient_id_value uuid := (select auth.uid());
  stool_entry_id uuid;
begin
  if patient_id_value is null or app_private.current_user_role() is distinct from 'patient' then
    raise exception using errcode = '42501', message = 'Only authenticated patients can save stool entries';
  end if;

  if p_occurred_at is null then
    raise exception using errcode = '22023', message = 'Stool entry time is required';
  end if;

  if p_bristol_type is null or p_bristol_type not between 1 and 7 then
    raise exception using errcode = '22023', message = 'Bristol type must be between 1 and 7';
  end if;

  if p_urgency_level is null or p_urgency_level not in ('none', 'mild', 'moderate', 'severe') then
    raise exception using errcode = '22023', message = 'Stool urgency level is invalid';
  end if;

  if p_pain is null
     or p_mucus is null
     or p_blood is null
     or p_fatty_stool is null
     or p_black_stool is null then
    raise exception using errcode = '22023', message = 'Stool symptom answers are required';
  end if;

  if p_entry_id is null then
    insert into public.patient_entries (patient_id, kind, occurred_at, text)
    values (patient_id_value, 'stool', p_occurred_at, null)
    returning id into stool_entry_id;
  else
    update public.patient_entries entry
    set occurred_at = p_occurred_at
    where entry.id = p_entry_id
      and entry.patient_id = patient_id_value
      and entry.kind = 'stool'
    returning entry.id into stool_entry_id;

    if stool_entry_id is null then
      raise exception using errcode = '42501', message = 'Stool entry is not editable by this patient';
    end if;
  end if;

  insert into public.stool_details (
    entry_id,
    bristol_type,
    urgency,
    urgency_level,
    pain,
    mucus,
    blood,
    fatty_stool,
    black_stool,
    notes
  )
  values (
    stool_entry_id,
    p_bristol_type,
    p_urgency_level <> 'none',
    p_urgency_level,
    p_pain,
    p_mucus,
    p_blood,
    p_fatty_stool,
    p_black_stool,
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  on conflict (entry_id) do update
  set bristol_type = excluded.bristol_type,
      urgency = excluded.urgency,
      urgency_level = excluded.urgency_level,
      pain = excluded.pain,
      mucus = excluded.mucus,
      blood = excluded.blood,
      fatty_stool = excluded.fatty_stool,
      black_stool = excluded.black_stool,
      notes = excluded.notes;

  return stool_entry_id;
end;
$$;

revoke execute on function public.save_patient_stool(
  uuid,
  timestamptz,
  integer,
  text,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  text
) from public, anon;

grant execute on function public.save_patient_stool(
  uuid,
  timestamptz,
  integer,
  text,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  text
) to authenticated;
