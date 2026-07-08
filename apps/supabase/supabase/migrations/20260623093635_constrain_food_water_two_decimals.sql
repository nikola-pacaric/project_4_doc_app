alter table public.food_form_details
  alter column water_liters type numeric(4, 2)
  using round(water_liters, 2);

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
  v_meal_index integer := 0;
  v_retained_meal_ids uuid[] := '{}'::uuid[];
  v_water_liters numeric(4, 2);
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

  if p_water_liters is null or p_water_liters < 0 or p_water_liters > 20 then
    raise exception using errcode = '22023', message = 'Water liters must be between 0 and 20';
  end if;

  v_water_liters := round(p_water_liters, 2);

  if p_has_other_fluids is null
     or (p_has_other_fluids and nullif(btrim(coalesce(p_other_fluids, '')), '') is null)
     or (not p_has_other_fluids and p_other_fluids is not null) then
    raise exception using errcode = '22023', message = 'Other-fluid answers are incomplete';
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
       or meal ->> 'meal_type' not in ('breakfast', 'lunch', 'dinner', 'snack', 'other')
       or nullif(btrim(coalesce(meal ->> 'name', '')), '') is null
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

  for v_meal in select value from jsonb_array_elements(p_meals)
  loop
    v_meal_index := v_meal_index + 1;
    v_meal_entry_id_text := nullif(btrim(coalesce(v_meal ->> 'entry_id', '')), '');
    v_meal_type := v_meal ->> 'meal_type';
    v_meal_name := btrim(v_meal ->> 'name');
    v_meal_description := nullif(btrim(coalesce(v_meal ->> 'description', '')), '');

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

      update public.meal_details
      set meal_type = v_meal_type,
          name = v_meal_name,
          description = v_meal_description
      where entry_id = v_meal_entry_id;
    else
      insert into public.patient_entries (patient_id, kind, occurred_at, text)
      values (
        v_patient_id,
        'meal',
        p_occurred_at + ((v_meal_index - 1) * interval '1 minute'),
        null
      )
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

revoke execute on function public.save_patient_food_form(
  timestamptz,
  timestamptz,
  timestamptz,
  numeric,
  boolean,
  text,
  jsonb
) from public, anon;

grant execute on function public.save_patient_food_form(
  timestamptz,
  timestamptz,
  timestamptz,
  numeric,
  boolean,
  text,
  jsonb
) to authenticated;
