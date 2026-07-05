alter type public.entry_kind add value if not exists 'fluid';

alter table public.other_fluid_details
  add column if not exists entry_id uuid references public.patient_entries(id) on delete cascade;

alter table public.other_fluid_details
  alter column name drop not null;

alter table public.other_fluid_details
  drop constraint if exists other_fluid_details_name_check;

alter table public.other_fluid_details
  add constraint other_fluid_details_name_check
    check (name is null or nullif(btrim(name), '') is not null);

create unique index if not exists other_fluid_details_entry_id_uidx
  on public.other_fluid_details (entry_id)
  where entry_id is not null;

create index if not exists other_fluid_details_daily_occurred_idx
  on public.other_fluid_details (daily_entry_id, occurred_at);

create or replace function app_private.enforce_other_fluid_entry_kinds()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actual_daily_kind text;
  actual_fluid_kind text;
begin
  select entry.kind::text
  into actual_daily_kind
  from public.patient_entries entry
  where entry.id = new.daily_entry_id;

  if actual_daily_kind is distinct from 'daily' then
    raise exception using
      errcode = '23514',
      message = 'other_fluid_details must reference a daily patient entry';
  end if;

  if new.entry_id is not null then
    select entry.kind::text
    into actual_fluid_kind
    from public.patient_entries entry
    where entry.id = new.entry_id;

    if actual_fluid_kind is distinct from 'fluid' then
      raise exception using
        errcode = '23514',
        message = 'other_fluid_details entry_id must reference a fluid patient entry';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_other_fluid_daily_entry_kind on public.other_fluid_details;
drop trigger if exists enforce_other_fluid_entry_kinds on public.other_fluid_details;
create trigger enforce_other_fluid_entry_kinds
  before insert or update of daily_entry_id, entry_id on public.other_fluid_details
  for each row execute function app_private.enforce_other_fluid_entry_kinds();

drop policy if exists "other_fluids_select_own_or_linked_doctor" on public.other_fluid_details;
create policy "other_fluids_select_own_or_linked_doctor"
  on public.other_fluid_details for select
  to authenticated
  using (
    app_private.patient_owns_entry(daily_entry_id)
    or app_private.patient_owns_entry(entry_id)
    or app_private.doctor_can_read_entry(daily_entry_id)
    or app_private.doctor_can_read_entry(entry_id)
  );

drop policy if exists "other_fluids_insert_own" on public.other_fluid_details;
create policy "other_fluids_insert_own"
  on public.other_fluid_details for insert
  to authenticated
  with check (
    app_private.patient_owns_entry(daily_entry_id)
    and (entry_id is null or app_private.patient_owns_entry(entry_id))
  );

drop policy if exists "other_fluids_update_own" on public.other_fluid_details;
create policy "other_fluids_update_own"
  on public.other_fluid_details for update
  to authenticated
  using (
    app_private.patient_owns_entry(daily_entry_id)
    and (entry_id is null or app_private.patient_owns_entry(entry_id))
  )
  with check (
    app_private.patient_owns_entry(daily_entry_id)
    and (entry_id is null or app_private.patient_owns_entry(entry_id))
  );

drop policy if exists "other_fluids_delete_own" on public.other_fluid_details;
create policy "other_fluids_delete_own"
  on public.other_fluid_details for delete
  to authenticated
  using (
    app_private.patient_owns_entry(daily_entry_id)
    and (entry_id is null or app_private.patient_owns_entry(entry_id))
  );

create or replace function public.save_patient_food_form(
  p_day_start timestamptz,
  p_day_end timestamptz,
  p_occurred_at timestamptz,
  p_water_liters numeric,
  p_has_other_fluids boolean,
  p_other_fluids text,
  p_meals jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_patient_id uuid := (select auth.uid());
  v_daily_entry_id uuid;
  v_meal_entry_id uuid;
  v_meal jsonb;
  v_meal_entry_id_text text;
  v_meal_type text;
  v_meal_name text;
  v_meal_description text;
  v_meal_occurred_at timestamptz;
  v_retained_meal_ids uuid[] := '{}'::uuid[];
  v_fluid_entry_id uuid;
  v_fluid jsonb;
  v_fluid_entry_id_text text;
  v_fluid_name text;
  v_fluid_occurred_at timestamptz;
  v_retained_fluid_ids uuid[] := '{}'::uuid[];
  v_water_liters numeric(4, 2);
  v_other_fluids_prefix text := 'project4:other-fluids:v1:';
  v_other_fluids_payload jsonb;
begin
  if v_patient_id is null or app_private.current_user_role() is distinct from 'patient' then
    raise exception using errcode = '42501', message = 'Only authenticated patients can save food forms';
  end if;

  if p_day_start is null
     or p_day_end is null
     or p_occurred_at is null
     or p_day_start >= p_day_end
     or p_day_end - p_day_start > interval '26 hours'
     or p_occurred_at < p_day_start
     or p_occurred_at >= p_day_end then
    raise exception using errcode = '22023', message = 'Invalid tracked-day range';
  end if;

  if p_water_liters is not null and (p_water_liters < 0 or p_water_liters > 20) then
    raise exception using errcode = '22023', message = 'Water liters must be between 0 and 20';
  end if;

  v_water_liters := case when p_water_liters is null then null else round(p_water_liters, 2) end;

  if (p_has_other_fluids is not true and p_other_fluids is not null) then
    raise exception using errcode = '22023', message = 'Other-fluid answers are incomplete';
  end if;

  if p_has_other_fluids and p_other_fluids is not null then
    if p_other_fluids not like v_other_fluids_prefix || '%' then
      raise exception using errcode = '22023', message = 'Other-fluid details are invalid';
    end if;

    begin
      v_other_fluids_payload := substring(p_other_fluids from length(v_other_fluids_prefix) + 1)::jsonb;
    exception when others then
      raise exception using errcode = '22023', message = 'Other-fluid details are invalid';
    end;

    if jsonb_typeof(v_other_fluids_payload) <> 'array'
       or jsonb_array_length(v_other_fluids_payload) = 0
       or jsonb_array_length(v_other_fluids_payload) > 32 then
      raise exception using errcode = '22023', message = 'Other-fluid details are invalid';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(v_other_fluids_payload) fluid
      where jsonb_typeof(fluid) <> 'object'
         or case
           when coalesce(pg_input_is_valid(fluid ->> 'occurredAt', 'timestamp with time zone'), false)
             then (fluid ->> 'occurredAt')::timestamptz < p_day_start
               or (fluid ->> 'occurredAt')::timestamptz >= p_day_end
           else true
         end
         or (
           nullif(btrim(coalesce(fluid ->> 'entryId', '')), '') is not null
           and not pg_input_is_valid(fluid ->> 'entryId', 'uuid')
         )
         or (
           nullif(btrim(coalesce(fluid ->> 'name', '')), '') is not null
           and btrim(fluid ->> 'name') = ''
         )
    ) then
      raise exception using errcode = '22023', message = 'Other-fluid details are invalid';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(v_other_fluids_payload) fluid
      where nullif(btrim(coalesce(fluid ->> 'entryId', '')), '') is not null
      group by fluid ->> 'entryId'
      having count(*) > 1
    ) then
      raise exception using errcode = '22023', message = 'A fluid entry cannot appear more than once';
    end if;
  end if;

  if p_meals is null or jsonb_typeof(p_meals) <> 'array' then
    raise exception using errcode = '22023', message = 'Meals must be a JSON array';
  end if;

  if jsonb_array_length(p_meals) > 32 then
    raise exception using errcode = '22023', message = 'A tracked day cannot contain more than 32 meals';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_meals) meal
    where jsonb_typeof(meal) <> 'object'
       or (
         nullif(btrim(coalesce(meal ->> 'meal_type', '')), '') is not null
         and meal ->> 'meal_type' not in ('breakfast', 'lunch', 'dinner', 'snack', 'other')
       )
       or (
         nullif(btrim(coalesce(meal ->> 'name', '')), '') is not null
         and btrim(meal ->> 'name') = ''
       )
       or case
         when coalesce(pg_input_is_valid(meal ->> 'occurred_at', 'timestamp with time zone'), false)
           then (meal ->> 'occurred_at')::timestamptz < p_day_start
             or (meal ->> 'occurred_at')::timestamptz >= p_day_end
         else true
       end
       or (
         nullif(btrim(coalesce(meal ->> 'entry_id', '')), '') is not null
         and not pg_input_is_valid(meal ->> 'entry_id', 'uuid')
       )
  ) then
    raise exception using errcode = '22023', message = 'One or more meals are invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_meals) meal
    where nullif(btrim(coalesce(meal ->> 'entry_id', '')), '') is not null
    group by meal ->> 'entry_id'
    having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'A meal entry cannot appear more than once';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_patient_id::text || ':' || p_day_start::text, 0)
  );

  select entry.id
  into v_daily_entry_id
  from public.patient_entries entry
  where entry.patient_id = v_patient_id
    and entry.kind = 'daily'
    and entry.occurred_at >= p_day_start
    and entry.occurred_at < p_day_end
  order by entry.occurred_at desc
  limit 1
  for update;

  if v_daily_entry_id is null then
    insert into public.patient_entries (patient_id, kind, occurred_at, text)
    values (v_patient_id, 'daily', p_occurred_at, null)
    returning id into v_daily_entry_id;
  end if;

  insert into public.daily_form_details (entry_id)
  values (v_daily_entry_id)
  on conflict (entry_id) do nothing;

  insert into public.food_form_details (
    entry_id,
    water_liters,
    has_other_fluids,
    other_fluids
  )
  values (
    v_daily_entry_id,
    v_water_liters,
    p_has_other_fluids,
    case when p_has_other_fluids then btrim(p_other_fluids) else null end
  )
  on conflict (entry_id) do update
  set water_liters = excluded.water_liters,
      has_other_fluids = excluded.has_other_fluids,
      other_fluids = excluded.other_fluids;

  delete from public.other_fluid_details
  where daily_entry_id = v_daily_entry_id
    and entry_id is null;

  if p_has_other_fluids and v_other_fluids_payload is not null then
    for v_fluid in select value from jsonb_array_elements(v_other_fluids_payload)
    loop
      v_fluid_entry_id_text := nullif(btrim(coalesce(v_fluid ->> 'entryId', '')), '');
      v_fluid_name := nullif(btrim(coalesce(v_fluid ->> 'name', '')), '');
      v_fluid_occurred_at := (v_fluid ->> 'occurredAt')::timestamptz;

      if v_fluid_entry_id_text is not null then
        select entry.id
        into v_fluid_entry_id
        from public.patient_entries entry
        where entry.id = v_fluid_entry_id_text::uuid
          and entry.patient_id = v_patient_id
          and entry.kind::text = 'fluid'
          and entry.occurred_at >= p_day_start
          and entry.occurred_at < p_day_end
        for update;

        if v_fluid_entry_id is null then
          raise exception using errcode = '42501', message = 'A referenced fluid is not editable for this tracked day';
        end if;

        update public.patient_entries
        set occurred_at = v_fluid_occurred_at
        where id = v_fluid_entry_id;

        update public.other_fluid_details
        set daily_entry_id = v_daily_entry_id,
            occurred_at = v_fluid_occurred_at,
            name = v_fluid_name
        where entry_id = v_fluid_entry_id;
      else
        insert into public.patient_entries (patient_id, kind, occurred_at, text)
        values (v_patient_id, 'fluid', v_fluid_occurred_at, null)
        returning id into v_fluid_entry_id;

        insert into public.other_fluid_details (entry_id, daily_entry_id, occurred_at, name)
        values (v_fluid_entry_id, v_daily_entry_id, v_fluid_occurred_at, v_fluid_name);
      end if;

      v_retained_fluid_ids := pg_catalog.array_append(v_retained_fluid_ids, v_fluid_entry_id);
    end loop;
  end if;

  delete from public.patient_entries entry
  where entry.patient_id = v_patient_id
    and entry.kind::text = 'fluid'
    and entry.occurred_at >= p_day_start
    and entry.occurred_at < p_day_end
    and not (entry.id = any(v_retained_fluid_ids));

  for v_meal in select value from jsonb_array_elements(p_meals)
  loop
    v_meal_entry_id_text := nullif(btrim(coalesce(v_meal ->> 'entry_id', '')), '');
    v_meal_type := nullif(btrim(coalesce(v_meal ->> 'meal_type', '')), '');
    v_meal_name := nullif(btrim(coalesce(v_meal ->> 'name', '')), '');
    v_meal_description := nullif(btrim(coalesce(v_meal ->> 'description', '')), '');
    v_meal_occurred_at := (v_meal ->> 'occurred_at')::timestamptz;

    if v_meal_entry_id_text is not null then
      select entry.id
      into v_meal_entry_id
      from public.patient_entries entry
      where entry.id = v_meal_entry_id_text::uuid
        and entry.patient_id = v_patient_id
        and entry.kind = 'meal'
        and entry.occurred_at >= p_day_start
        and entry.occurred_at < p_day_end
      for update;

      if v_meal_entry_id is null then
        raise exception using errcode = '42501', message = 'A referenced meal is not editable for this tracked day';
      end if;

      update public.patient_entries
      set occurred_at = v_meal_occurred_at
      where id = v_meal_entry_id;

      update public.meal_details
      set meal_type = v_meal_type,
          name = v_meal_name,
          description = v_meal_description
      where entry_id = v_meal_entry_id;
    else
      insert into public.patient_entries (patient_id, kind, occurred_at, text)
      values (v_patient_id, 'meal', v_meal_occurred_at, null)
      returning id into v_meal_entry_id;

      insert into public.meal_details (entry_id, meal_type, name, description)
      values (v_meal_entry_id, v_meal_type, v_meal_name, v_meal_description);
    end if;

    v_retained_meal_ids := pg_catalog.array_append(v_retained_meal_ids, v_meal_entry_id);
  end loop;

  delete from public.patient_entries entry
  where entry.patient_id = v_patient_id
    and entry.kind = 'meal'
    and entry.occurred_at >= p_day_start
    and entry.occurred_at < p_day_end
    and not (entry.id = any(v_retained_meal_ids));

  return v_daily_entry_id;
end;
$$;
