do $$
begin
  if exists (
    select 1
    from public.medication_details details
    join public.patient_entries entry on entry.id = details.entry_id
    where nullif(btrim(coalesce(details.name, '')), '') is null
       or nullif(btrim(coalesce(details.dose, '')), '') is null
       or details.is_chronic_therapy is null
       or entry.kind <> 'medication'
  ) then
    raise exception 'Cannot harden medication data while invalid rows exist';
  end if;
end;
$$;

alter table public.medication_details
  alter column name set not null,
  alter column dose set not null,
  alter column is_chronic_therapy set not null;

alter table public.medication_details
  drop constraint if exists medication_details_required_fields_check,
  drop constraint if exists medication_details_name_check,
  drop constraint if exists medication_details_dose_check;

alter table public.medication_details
  add constraint medication_details_name_check
    check (nullif(btrim(name), '') is not null),
  add constraint medication_details_dose_check
    check (nullif(btrim(dose), '') is not null);

create or replace function app_private.enforce_medication_entry_kind()
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

  if actual_kind is distinct from 'medication' then
    raise exception using
      errcode = '23514',
      message = 'medication_details must reference a patient_entries row with kind medication';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_medication_entry_kind on public.medication_details;
create trigger enforce_medication_entry_kind
  before insert or update of entry_id on public.medication_details
  for each row execute function app_private.enforce_medication_entry_kind();

revoke all privileges on table public.medication_details from anon, authenticated;
grant select, insert, update, delete on table public.medication_details to authenticated;

alter table public.medication_details enable row level security;

drop policy if exists "medication_select_own_or_linked_doctor" on public.medication_details;
create policy "medication_select_own_or_linked_doctor"
  on public.medication_details for select
  to authenticated
  using (app_private.patient_owns_entry(entry_id) or app_private.doctor_can_read_entry(entry_id));

drop policy if exists "medication_insert_own" on public.medication_details;
create policy "medication_insert_own"
  on public.medication_details for insert
  to authenticated
  with check (app_private.patient_owns_entry(entry_id));

drop policy if exists "medication_update_own" on public.medication_details;
create policy "medication_update_own"
  on public.medication_details for update
  to authenticated
  using (app_private.patient_owns_entry(entry_id))
  with check (app_private.patient_owns_entry(entry_id));

drop policy if exists "medication_delete_own" on public.medication_details;
create policy "medication_delete_own"
  on public.medication_details for delete
  to authenticated
  using (app_private.patient_owns_entry(entry_id));

create or replace function public.save_patient_medication(
  p_entry_id uuid,
  p_occurred_at timestamptz,
  p_name text,
  p_dose text,
  p_notes text,
  p_is_chronic_therapy boolean
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  patient_id_value uuid := (select auth.uid());
  medication_entry_id uuid;
begin
  if patient_id_value is null or app_private.current_user_role() is distinct from 'patient' then
    raise exception using errcode = '42501', message = 'Only authenticated patients can save medications';
  end if;

  if p_occurred_at is null then
    raise exception using errcode = '22023', message = 'Medication time is required';
  end if;

  if nullif(btrim(coalesce(p_name, '')), '') is null then
    raise exception using errcode = '22023', message = 'Medication name is required';
  end if;

  if nullif(btrim(coalesce(p_dose, '')), '') is null then
    raise exception using errcode = '22023', message = 'Medication dose is required';
  end if;

  if p_is_chronic_therapy is null then
    raise exception using errcode = '22023', message = 'Medication chronic-therapy answer is required';
  end if;

  if p_entry_id is null then
    insert into public.patient_entries (patient_id, kind, occurred_at, text)
    values (patient_id_value, 'medication', p_occurred_at, null)
    returning id into medication_entry_id;
  else
    update public.patient_entries entry
    set occurred_at = p_occurred_at
    where entry.id = p_entry_id
      and entry.patient_id = patient_id_value
      and entry.kind = 'medication'
    returning entry.id into medication_entry_id;

    if medication_entry_id is null then
      raise exception using errcode = '42501', message = 'Medication entry is not editable by this patient';
    end if;
  end if;

  insert into public.medication_details (
    entry_id,
    name,
    dose,
    notes,
    is_chronic_therapy
  )
  values (
    medication_entry_id,
    btrim(p_name),
    btrim(p_dose),
    nullif(btrim(coalesce(p_notes, '')), ''),
    p_is_chronic_therapy
  )
  on conflict (entry_id) do update
  set name = excluded.name,
      dose = excluded.dose,
      notes = excluded.notes,
      is_chronic_therapy = excluded.is_chronic_therapy;

  return medication_entry_id;
end;
$$;

revoke execute on function public.save_patient_medication(
  uuid,
  timestamptz,
  text,
  text,
  text,
  boolean
) from public, anon;

grant execute on function public.save_patient_medication(
  uuid,
  timestamptz,
  text,
  text,
  text,
  boolean
) to authenticated;
