do $$
begin
  if exists (
    select 1
    from public.menstruation_events event
    join public.patient_entries entry on entry.id = event.entry_id
    where event.flow is null
       or event.flow not in ('light', 'moderate', 'heavy')
       or event.pain_level is null
       or event.pain_level not between 1 and 3
       or entry.kind <> 'menstruation'
  ) then
    raise exception 'Cannot harden menstruation data while invalid rows exist';
  end if;
end;
$$;

alter table public.menstruation_events
  alter column flow set not null,
  alter column pain_level set not null;

alter table public.menstruation_events
  drop constraint if exists menstruation_events_flow_check,
  drop constraint if exists menstruation_events_pain_level_check,
  drop constraint if exists menstruation_events_required_fields_check;

alter table public.menstruation_events
  add constraint menstruation_events_flow_check
    check (flow in ('light', 'moderate', 'heavy')),
  add constraint menstruation_events_pain_level_check
    check (pain_level between 1 and 3);

create or replace function app_private.enforce_menstruation_entry_kind()
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

  if actual_kind is distinct from 'menstruation' then
    raise exception using
      errcode = '23514',
      message = 'menstruation_events must reference a patient_entries row with kind menstruation';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_menstruation_entry_kind on public.menstruation_events;
create trigger enforce_menstruation_entry_kind
  before insert or update of entry_id on public.menstruation_events
  for each row execute function app_private.enforce_menstruation_entry_kind();

revoke all privileges on table public.menstruation_events from anon, authenticated;
grant select, insert, update, delete on table public.menstruation_events to authenticated;

alter table public.menstruation_events enable row level security;

drop policy if exists "menstruation_select_own_or_linked_doctor" on public.menstruation_events;
create policy "menstruation_select_own_or_linked_doctor"
  on public.menstruation_events for select
  to authenticated
  using (app_private.patient_owns_entry(entry_id) or app_private.doctor_can_read_entry(entry_id));

drop policy if exists "menstruation_insert_own" on public.menstruation_events;
create policy "menstruation_insert_own"
  on public.menstruation_events for insert
  to authenticated
  with check (
    app_private.patient_owns_entry(entry_id)
    and exists (
      select 1
      from public.patient_entries entry
      join public.patient_baseline_profiles baseline on baseline.patient_id = entry.patient_id
      where entry.id = entry_id and baseline.sex = 'female'
    )
  );

drop policy if exists "menstruation_update_own" on public.menstruation_events;
create policy "menstruation_update_own"
  on public.menstruation_events for update
  to authenticated
  using (app_private.patient_owns_entry(entry_id))
  with check (
    app_private.patient_owns_entry(entry_id)
    and exists (
      select 1
      from public.patient_entries entry
      join public.patient_baseline_profiles baseline on baseline.patient_id = entry.patient_id
      where entry.id = entry_id and baseline.sex = 'female'
    )
  );

drop policy if exists "menstruation_delete_own" on public.menstruation_events;
create policy "menstruation_delete_own"
  on public.menstruation_events for delete
  to authenticated
  using (app_private.patient_owns_entry(entry_id));

create or replace function public.save_patient_menstruation(
  p_entry_id uuid,
  p_occurred_at timestamptz,
  p_flow text,
  p_pain_level integer,
  p_notes text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  patient_id_value uuid := (select auth.uid());
  menstruation_entry_id uuid;
begin
  if patient_id_value is null or app_private.current_user_role() is distinct from 'patient' then
    raise exception using errcode = '42501', message = 'Only authenticated patients can save period entries';
  end if;

  if not exists (
    select 1
    from public.patient_baseline_profiles baseline
    where baseline.patient_id = patient_id_value
      and baseline.sex = 'female'
  ) then
    raise exception using errcode = '42501', message = 'Period entries are only available for female patients';
  end if;

  if p_occurred_at is null then
    raise exception using errcode = '22023', message = 'Period entry time is required';
  end if;

  if p_flow is null or p_flow not in ('light', 'moderate', 'heavy') then
    raise exception using errcode = '22023', message = 'Period flow is invalid';
  end if;

  if p_pain_level is null or p_pain_level not between 1 and 3 then
    raise exception using errcode = '22023', message = 'Period pain level must be between 1 and 3';
  end if;

  if p_entry_id is null then
    insert into public.patient_entries (patient_id, kind, occurred_at, text)
    values (patient_id_value, 'menstruation', p_occurred_at, null)
    returning id into menstruation_entry_id;
  else
    update public.patient_entries entry
    set occurred_at = p_occurred_at
    where entry.id = p_entry_id
      and entry.patient_id = patient_id_value
      and entry.kind = 'menstruation'
    returning entry.id into menstruation_entry_id;

    if menstruation_entry_id is null then
      raise exception using errcode = '42501', message = 'Period entry is not editable by this patient';
    end if;
  end if;

  insert into public.menstruation_events (
    entry_id,
    flow,
    pain_level,
    notes
  )
  values (
    menstruation_entry_id,
    p_flow,
    p_pain_level,
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  on conflict (entry_id) do update
  set flow = excluded.flow,
      pain_level = excluded.pain_level,
      notes = excluded.notes;

  return menstruation_entry_id;
end;
$$;

revoke execute on function public.save_patient_menstruation(
  uuid,
  timestamptz,
  text,
  integer,
  text
) from public, anon;

grant execute on function public.save_patient_menstruation(
  uuid,
  timestamptz,
  text,
  integer,
  text
) to authenticated;

create or replace function public.save_patient_note(
  p_entry_id uuid,
  p_occurred_at timestamptz,
  p_text text
)
returns table (
  id uuid,
  patient_id uuid,
  kind public.entry_kind,
  occurred_at timestamptz,
  text text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  patient_id_value uuid := (select auth.uid());
  note_entry_id uuid;
begin
  if patient_id_value is null or app_private.current_user_role() is distinct from 'patient' then
    raise exception using errcode = '42501', message = 'Only authenticated patients can save notes';
  end if;

  if p_occurred_at is null then
    raise exception using errcode = '22023', message = 'Note time is required';
  end if;

  if nullif(btrim(coalesce(p_text, '')), '') is null then
    raise exception using errcode = '22023', message = 'Note text is required';
  end if;

  if p_entry_id is null then
    insert into public.patient_entries (patient_id, kind, occurred_at, text)
    values (patient_id_value, 'note', p_occurred_at, btrim(p_text))
    returning patient_entries.id into note_entry_id;
  else
    update public.patient_entries entry
    set occurred_at = p_occurred_at,
        text = btrim(p_text)
    where entry.id = p_entry_id
      and entry.patient_id = patient_id_value
      and entry.kind = 'note'
    returning entry.id into note_entry_id;

    if note_entry_id is null then
      raise exception using errcode = '42501', message = 'Note entry is not editable by this patient';
    end if;
  end if;

  return query
  select
    entry.id,
    entry.patient_id,
    entry.kind,
    entry.occurred_at,
    entry.text,
    entry.created_at,
    entry.updated_at
  from public.patient_entries entry
  where entry.id = note_entry_id;
end;
$$;

revoke execute on function public.save_patient_note(
  uuid,
  timestamptz,
  text
) from public, anon;

grant execute on function public.save_patient_note(
  uuid,
  timestamptz,
  text
) to authenticated;
