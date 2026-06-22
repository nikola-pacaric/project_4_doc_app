do $$
begin
  if exists (
    select 1
    from public.food_form_details
    where water_liters is null
       or has_other_fluids is null
       or (has_other_fluids and nullif(btrim(coalesce(other_fluids, '')), '') is null)
       or (not has_other_fluids and other_fluids is not null)
  ) then
    raise exception 'Cannot require complete food hydration fields while incomplete rows exist';
  end if;

  if exists (
    select 1
    from public.meal_details
    where meal_type is null
       or nullif(btrim(coalesce(name, '')), '') is null
  ) then
    raise exception 'Cannot require complete meal fields while incomplete rows exist';
  end if;
end;
$$;

alter table public.food_form_details
  alter column water_liters set not null,
  alter column has_other_fluids set not null;

alter table public.food_form_details
  drop constraint if exists food_form_details_other_fluids_check;

alter table public.food_form_details
  add constraint food_form_details_other_fluids_check
  check (
    (
      has_other_fluids
      and nullif(btrim(coalesce(other_fluids, '')), '') is not null
    )
    or (
      not has_other_fluids
      and other_fluids is null
    )
  );

alter table public.meal_details
  alter column meal_type set not null,
  alter column name set not null;

alter table public.meal_details
  drop constraint if exists meal_details_meal_type_check,
  drop constraint if exists meal_details_name_check;

alter table public.meal_details
  add constraint meal_details_meal_type_check
    check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
  add constraint meal_details_name_check
    check (nullif(btrim(name), '') is not null);

create or replace function app_private.enforce_food_entry_kind()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  expected_kind text;
  actual_kind text;
begin
  expected_kind := case tg_table_name
    when 'food_form_details' then 'daily'
    when 'meal_details' then 'meal'
    else null
  end;

  select entry.kind
  into actual_kind
  from public.patient_entries entry
  where entry.id = new.entry_id;

  if actual_kind is distinct from expected_kind then
    raise exception using
      errcode = '23514',
      message = format(
        '%s must reference a patient_entries row with kind %s',
        tg_table_name,
        expected_kind
      );
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_food_form_entry_kind on public.food_form_details;
create trigger enforce_food_form_entry_kind
  before insert or update of entry_id on public.food_form_details
  for each row execute function app_private.enforce_food_entry_kind();

drop trigger if exists enforce_meal_entry_kind on public.meal_details;
create trigger enforce_meal_entry_kind
  before insert or update of entry_id on public.meal_details
  for each row execute function app_private.enforce_food_entry_kind();

revoke all privileges on table public.food_form_details from anon, authenticated;
revoke all privileges on table public.meal_details from anon, authenticated;
grant select, insert, update, delete on table public.food_form_details to authenticated;
grant select, insert, update, delete on table public.meal_details to authenticated;

alter table public.food_form_details enable row level security;
alter table public.meal_details enable row level security;

drop policy if exists "food_form_select_own_or_linked_doctor" on public.food_form_details;
create policy "food_form_select_own_or_linked_doctor"
  on public.food_form_details for select
  to authenticated
  using (app_private.patient_owns_entry(entry_id) or app_private.doctor_can_read_entry(entry_id));

drop policy if exists "food_form_insert_own" on public.food_form_details;
create policy "food_form_insert_own"
  on public.food_form_details for insert
  to authenticated
  with check (app_private.patient_owns_entry(entry_id));

drop policy if exists "food_form_update_own" on public.food_form_details;
create policy "food_form_update_own"
  on public.food_form_details for update
  to authenticated
  using (app_private.patient_owns_entry(entry_id))
  with check (app_private.patient_owns_entry(entry_id));

drop policy if exists "food_form_delete_own" on public.food_form_details;
create policy "food_form_delete_own"
  on public.food_form_details for delete
  to authenticated
  using (app_private.patient_owns_entry(entry_id));

drop policy if exists "meal_select_own_or_linked_doctor" on public.meal_details;
create policy "meal_select_own_or_linked_doctor"
  on public.meal_details for select
  to authenticated
  using (app_private.patient_owns_entry(entry_id) or app_private.doctor_can_read_entry(entry_id));

drop policy if exists "meal_insert_own" on public.meal_details;
create policy "meal_insert_own"
  on public.meal_details for insert
  to authenticated
  with check (app_private.patient_owns_entry(entry_id));

drop policy if exists "meal_update_own" on public.meal_details;
create policy "meal_update_own"
  on public.meal_details for update
  to authenticated
  using (app_private.patient_owns_entry(entry_id))
  with check (app_private.patient_owns_entry(entry_id));

drop policy if exists "meal_delete_own" on public.meal_details;
create policy "meal_delete_own"
  on public.meal_details for delete
  to authenticated
  using (app_private.patient_owns_entry(entry_id));
