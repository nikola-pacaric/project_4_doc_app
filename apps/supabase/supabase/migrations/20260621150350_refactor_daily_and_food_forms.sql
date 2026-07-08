create table if not exists public.food_form_details (
  entry_id uuid primary key references public.patient_entries (id) on delete cascade,
  water_liters numeric(5, 3),
  has_other_fluids boolean,
  other_fluids text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint food_form_details_water_liters_check
    check (water_liters is null or (water_liters >= 0 and water_liters <= 20)),
  constraint food_form_details_other_fluids_check
    check (
      has_other_fluids is not true
      or nullif(btrim(coalesce(other_fluids, '')), '') is not null
    )
);

insert into public.food_form_details (
  entry_id,
  water_liters,
  has_other_fluids,
  other_fluids
)
select
  entry_id,
  case when water_ml is null then null else water_ml::numeric / 1000 end,
  coalesce(has_other_fluids, nullif(btrim(other_fluids), '') is not null),
  case
    when coalesce(has_other_fluids, nullif(btrim(other_fluids), '') is not null)
      then nullif(btrim(other_fluids), '')
    else null
  end
from public.daily_form_details
where water_ml is not null
   or has_other_fluids is not null
   or nullif(btrim(other_fluids), '') is not null
on conflict (entry_id) do update
set water_liters = excluded.water_liters,
    has_other_fluids = excluded.has_other_fluids,
    other_fluids = excluded.other_fluids;

with legacy_food as (
  select
    details.entry_id,
    entries.patient_id,
    entries.occurred_at,
    btrim(details.food_notes) as description,
    'migrated-daily-food:' || details.entry_id::text as client_entry_id
  from public.daily_form_details details
  join public.patient_entries entries on entries.id = details.entry_id
  where nullif(btrim(details.food_notes), '') is not null
),
inserted_entries as (
  insert into public.patient_entries (patient_id, kind, occurred_at, client_entry_id)
  select patient_id, 'meal', occurred_at, client_entry_id
  from legacy_food
  on conflict (patient_id, client_entry_id)
  where client_entry_id is not null
  do nothing
  returning id, client_entry_id
)
insert into public.meal_details (entry_id, meal_type, name, description)
select inserted.id, 'other', 'Migrated food entry', legacy.description
from inserted_entries inserted
join legacy_food legacy on legacy.client_entry_id = inserted.client_entry_id
on conflict (entry_id) do nothing;

insert into public.patient_entries (
  patient_id,
  kind,
  occurred_at,
  text,
  client_entry_id
)
select
  entries.patient_id,
  'note',
  entries.occurred_at,
  btrim(details.notes),
  'migrated-daily-note:' || details.entry_id::text
from public.daily_form_details details
join public.patient_entries entries on entries.id = details.entry_id
where nullif(btrim(details.notes), '') is not null
on conflict (patient_id, client_entry_id)
where client_entry_id is not null
do nothing;

drop trigger if exists set_food_form_details_updated_at on public.food_form_details;
create trigger set_food_form_details_updated_at
  before update on public.food_form_details
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.food_form_details to authenticated;

alter table public.food_form_details enable row level security;

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

alter table public.daily_form_details
  drop column if exists food_notes,
  drop column if exists water_ml,
  drop column if exists has_other_fluids,
  drop column if exists other_fluids,
  drop column if exists has_additional_notes,
  drop column if exists notes;
