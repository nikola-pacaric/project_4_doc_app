create extension if not exists pgcrypto;

create schema if not exists app_private;

do $$
begin
  create type public.user_role as enum ('patient', 'doctor');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.entry_kind as enum (
    'text',
    'daily',
    'meal',
    'symptom',
    'stool',
    'medication',
    'exercise',
    'menstruation',
    'note',
    'custom'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.export_mode as enum (
    'all_data',
    'all_data_with_images',
    'images_only_with_labels'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.export_range_type as enum ('selected_day', 'partial_month');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  display_name text,
  app_language text not null default 'en' check (app_language in ('en', 'sr')),
  voice_language text not null default 'en-US' check (voice_language in ('en-US', 'sr-RS')),
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  consent_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patient_baseline_profiles (
  patient_id uuid primary key references public.user_profiles (id) on delete cascade,
  sex text check (sex in ('female', 'male', 'other', 'prefer_not_to_say')),
  birth_year integer check (birth_year between 1900 and 2100),
  occupation text,
  chronic_diseases text,
  chronic_therapy text,
  menstrual_history text,
  weight_kg numeric(5, 2) check (weight_kg > 0),
  height_cm numeric(5, 2) check (height_cm > 0),
  recent_major_weight_change text,
  weight_reminder_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patient_entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.user_profiles (id) on delete cascade,
  kind public.entry_kind not null,
  occurred_at timestamptz not null,
  text text,
  client_entry_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'text' or nullif(btrim(coalesce(text, '')), '') is not null)
);

create index if not exists patient_entries_patient_occurred_idx
  on public.patient_entries (patient_id, occurred_at desc);

create unique index if not exists patient_entries_patient_client_entry_uidx
  on public.patient_entries (patient_id, client_entry_id)
  where client_entry_id is not null;

create table if not exists public.daily_form_details (
  entry_id uuid primary key references public.patient_entries (id) on delete cascade,
  wake_time time,
  food_notes text,
  appetite text check (appetite in ('low', 'usual', 'high')),
  water_ml integer check (water_ml >= 0),
  other_fluids text,
  activity_notes text,
  sleep_notes text,
  stress_level integer check (stress_level between 1 and 3),
  day_description text,
  medication_outside_chronic_therapy text,
  menstruation_notes text,
  energy_level integer check (energy_level between 1 and 3),
  naps text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meal_details (
  entry_id uuid primary key references public.patient_entries (id) on delete cascade,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.symptom_details (
  entry_id uuid primary key references public.patient_entries (id) on delete cascade,
  intake_list text,
  started_at timestamptz,
  ended_at timestamptz,
  intensity integer check (intensity between 1 and 3),
  quality_of_life_effect text,
  modifying_factors text,
  sleep_interruption boolean,
  pain_location text,
  pain_radiation text,
  pain_description text,
  custom_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or started_at is null or ended_at >= started_at)
);

create table if not exists public.stool_details (
  entry_id uuid primary key references public.patient_entries (id) on delete cascade,
  bristol_type integer check (bristol_type between 1 and 7),
  urgency boolean,
  pain boolean,
  mucus boolean,
  blood boolean,
  fatty_stool boolean,
  black_stool boolean,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medication_details (
  entry_id uuid primary key references public.patient_entries (id) on delete cascade,
  name text,
  dose text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercise_details (
  entry_id uuid primary key references public.patient_entries (id) on delete cascade,
  activity text,
  duration_minutes integer check (duration_minutes >= 0),
  intensity text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menstruation_events (
  entry_id uuid primary key references public.patient_entries (id) on delete cascade,
  flow text,
  pain_level integer check (pain_level between 1 and 3),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entry_photos (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.patient_entries (id) on delete cascade,
  patient_id uuid not null references public.user_profiles (id) on delete cascade,
  photo_path text not null,
  thumbnail_path text not null,
  original_filename text,
  mime_type text not null default 'image/jpeg' check (mime_type = 'image/jpeg'),
  width_px integer check (width_px is null or width_px <= 1280),
  height_px integer check (height_px is null or height_px > 0),
  size_bytes integer check (size_bytes is null or size_bytes > 0),
  thumbnail_size_bytes integer check (thumbnail_size_bytes is null or thumbnail_size_bytes > 0),
  created_at timestamptz not null default now(),
  unique (photo_path),
  unique (thumbnail_path)
);

create index if not exists entry_photos_patient_idx
  on public.entry_photos (patient_id, created_at desc);

create table if not exists public.doctor_invite_codes (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.user_profiles (id) on delete cascade,
  code text not null unique,
  expires_at timestamptz not null default now() + interval '7 days',
  revoked_at timestamptz,
  redeemed_by_patient_id uuid references public.user_profiles (id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (
    (redeemed_at is null and redeemed_by_patient_id is null)
    or (redeemed_at is not null and redeemed_by_patient_id is not null)
  )
);

create index if not exists doctor_invite_codes_doctor_idx
  on public.doctor_invite_codes (doctor_id, created_at desc);

create table if not exists public.doctor_patient_access (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.user_profiles (id) on delete cascade,
  patient_id uuid not null references public.user_profiles (id) on delete cascade,
  invite_code_id uuid references public.doctor_invite_codes (id) on delete set null,
  active boolean not null default true,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (doctor_id <> patient_id),
  check ((active = true and revoked_at is null) or (active = false))
);

create unique index if not exists doctor_patient_access_active_uidx
  on public.doctor_patient_access (doctor_id, patient_id)
  where active = true and revoked_at is null;

create table if not exists public.export_requests (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.user_profiles (id) on delete cascade,
  patient_id uuid not null references public.user_profiles (id) on delete cascade,
  mode public.export_mode not null,
  range_type public.export_range_type not null,
  selected_date date,
  selected_month date,
  status text not null default 'created' check (status in ('created', 'processing', 'completed', 'failed')),
  result jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (
    (range_type = 'selected_day' and selected_date is not null and selected_month is null)
    or (range_type = 'partial_month' and selected_month is not null and selected_date is null)
  ),
  check (result is null or result::text not like '%data:image/%'),
  check (result is null or result::text not like '%;base64,%')
);

create index if not exists export_requests_doctor_idx
  on public.export_requests (doctor_id, created_at desc);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.user_profiles (id) on delete set null,
  actor_role public.user_role,
  patient_id uuid references public.user_profiles (id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_patient_idx
  on public.audit_events (patient_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_user_profile_role_change()
returns trigger
language plpgsql
as $$
begin
  if old.role is distinct from new.role then
    raise exception 'user profile role is immutable' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists prevent_user_profile_role_change on public.user_profiles;
create trigger prevent_user_profile_role_change
  before update on public.user_profiles
  for each row execute function public.prevent_user_profile_role_change();

drop trigger if exists set_patient_baseline_profiles_updated_at on public.patient_baseline_profiles;
create trigger set_patient_baseline_profiles_updated_at
  before update on public.patient_baseline_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_patient_entries_updated_at on public.patient_entries;
create trigger set_patient_entries_updated_at
  before update on public.patient_entries
  for each row execute function public.set_updated_at();

drop trigger if exists set_daily_form_details_updated_at on public.daily_form_details;
create trigger set_daily_form_details_updated_at
  before update on public.daily_form_details
  for each row execute function public.set_updated_at();

drop trigger if exists set_meal_details_updated_at on public.meal_details;
create trigger set_meal_details_updated_at
  before update on public.meal_details
  for each row execute function public.set_updated_at();

drop trigger if exists set_symptom_details_updated_at on public.symptom_details;
create trigger set_symptom_details_updated_at
  before update on public.symptom_details
  for each row execute function public.set_updated_at();

drop trigger if exists set_stool_details_updated_at on public.stool_details;
create trigger set_stool_details_updated_at
  before update on public.stool_details
  for each row execute function public.set_updated_at();

drop trigger if exists set_medication_details_updated_at on public.medication_details;
create trigger set_medication_details_updated_at
  before update on public.medication_details
  for each row execute function public.set_updated_at();

drop trigger if exists set_exercise_details_updated_at on public.exercise_details;
create trigger set_exercise_details_updated_at
  before update on public.exercise_details
  for each row execute function public.set_updated_at();

drop trigger if exists set_menstruation_events_updated_at on public.menstruation_events;
create trigger set_menstruation_events_updated_at
  before update on public.menstruation_events
  for each row execute function public.set_updated_at();

create or replace function app_private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_profiles where id = auth.uid()
$$;

create or replace function app_private.is_linked_doctor(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.doctor_patient_access access
    where access.doctor_id = auth.uid()
      and access.patient_id = target_patient_id
      and access.active = true
      and access.revoked_at is null
  )
$$;

create or replace function app_private.patient_owns_entry(target_entry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.patient_entries entry
    where entry.id = target_entry_id
      and entry.patient_id = auth.uid()
  )
$$;

create or replace function app_private.doctor_can_read_entry(target_entry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.patient_entries entry
    join public.doctor_patient_access access
      on access.patient_id = entry.patient_id
    where entry.id = target_entry_id
      and access.doctor_id = auth.uid()
      and access.active = true
      and access.revoked_at is null
  )
$$;

create or replace function app_private.assert_user_role(target_user_id uuid, expected_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles profile
    where profile.id = target_user_id
      and profile.role = expected_role
  )
$$;

create or replace function public.create_doctor_invite_code()
returns table (id uuid, code text, expires_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  generated_code text;
begin
  if app_private.current_user_role() <> 'doctor' then
    raise exception 'only doctors can create invite codes' using errcode = '42501';
  end if;

  generated_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  return query
  insert into public.doctor_invite_codes (doctor_id, code)
  values (auth.uid(), generated_code)
  returning doctor_invite_codes.id, doctor_invite_codes.code, doctor_invite_codes.expires_at;
end;
$$;

create or replace function public.revoke_doctor_invite_code(invite_code_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  affected_rows integer;
begin
  if app_private.current_user_role() <> 'doctor' then
    raise exception 'only doctors can revoke invite codes' using errcode = '42501';
  end if;

  update public.doctor_invite_codes
  set revoked_at = now()
  where id = invite_code_id
    and doctor_id = auth.uid()
    and revoked_at is null
    and redeemed_at is null;

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

create or replace function app_private.redeem_doctor_invite_code(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  found_code public.doctor_invite_codes%rowtype;
  access_id uuid;
begin
  if app_private.current_user_role() <> 'patient' then
    raise exception 'only patients can redeem invite codes' using errcode = '42501';
  end if;

  select *
  into found_code
  from public.doctor_invite_codes
  where code = invite_code
    and revoked_at is null
    and redeemed_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'invite code is invalid, expired, revoked, or already used' using errcode = '22023';
  end if;

  update public.doctor_invite_codes
  set redeemed_by_patient_id = auth.uid(),
      redeemed_at = now()
  where id = found_code.id;

  insert into public.doctor_patient_access (doctor_id, patient_id, invite_code_id)
  values (found_code.doctor_id, auth.uid(), found_code.id)
  on conflict (doctor_id, patient_id)
  where active = true and revoked_at is null
  do update set active = true, revoked_at = null
  returning id into access_id;

  insert into public.audit_events (actor_id, actor_role, patient_id, event_type, metadata)
  values (
    auth.uid(),
    'patient',
    auth.uid(),
    'doctor_invite_redeemed',
    jsonb_build_object('doctor_id', found_code.doctor_id, 'invite_code_id', found_code.id)
  );

  return access_id;
end;
$$;

create or replace function app_private.export_patient_data(
  target_patient_id uuid,
  export_mode public.export_mode,
  export_range_type public.export_range_type,
  selected_date date default null,
  selected_month date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
begin
  if app_private.current_user_role() <> 'doctor'
    or not app_private.is_linked_doctor(target_patient_id) then
    raise exception 'doctor is not linked to this patient' using errcode = '42501';
  end if;

  if export_range_type = 'selected_day' and selected_date is null then
    raise exception 'selected_date is required for selected_day exports' using errcode = '22023';
  end if;

  if export_range_type = 'partial_month' and selected_month is null then
    raise exception 'selected_month is required for partial_month exports' using errcode = '22023';
  end if;

  payload := jsonb_build_object(
    'patientId', target_patient_id,
    'mode', export_mode,
    'rangeType', export_range_type,
    'selectedDate', selected_date,
    'selectedMonth', selected_month,
    'generatedAt', now(),
    'entries', '[]'::jsonb
  );

  if payload::text like '%data:image/%' or payload::text like '%;base64,%' then
    raise exception 'export payload must not contain base64 images' using errcode = '22023';
  end if;

  insert into public.export_requests (
    doctor_id,
    patient_id,
    mode,
    range_type,
    selected_date,
    selected_month,
    status,
    result,
    completed_at
  )
  values (
    auth.uid(),
    target_patient_id,
    export_mode,
    export_range_type,
    selected_date,
    selected_month,
    'completed',
    payload,
    now()
  );

  insert into public.audit_events (actor_id, actor_role, patient_id, event_type, metadata)
  values (
    auth.uid(),
    'doctor',
    target_patient_id,
    'patient_export_created',
    jsonb_build_object('mode', export_mode, 'range_type', export_range_type)
  );

  return payload;
end;
$$;

grant usage on schema public to anon, authenticated;
grant usage on schema app_private to authenticated;

grant select, insert, update, delete on
  public.user_profiles,
  public.patient_baseline_profiles,
  public.patient_entries,
  public.daily_form_details,
  public.meal_details,
  public.symptom_details,
  public.stool_details,
  public.medication_details,
  public.exercise_details,
  public.menstruation_events,
  public.entry_photos,
  public.doctor_invite_codes,
  public.doctor_patient_access,
  public.export_requests
to authenticated;

grant insert on public.audit_events to authenticated;
grant execute on function public.create_doctor_invite_code() to authenticated;
grant execute on function public.revoke_doctor_invite_code(uuid) to authenticated;

alter table public.user_profiles enable row level security;
alter table public.patient_baseline_profiles enable row level security;
alter table public.patient_entries enable row level security;
alter table public.daily_form_details enable row level security;
alter table public.meal_details enable row level security;
alter table public.symptom_details enable row level security;
alter table public.stool_details enable row level security;
alter table public.medication_details enable row level security;
alter table public.exercise_details enable row level security;
alter table public.menstruation_events enable row level security;
alter table public.entry_photos enable row level security;
alter table public.doctor_invite_codes enable row level security;
alter table public.doctor_patient_access enable row level security;
alter table public.export_requests enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists "profiles_select_own_or_linked_patient" on public.user_profiles;
create policy "profiles_select_own_or_linked_patient"
  on public.user_profiles for select
  to authenticated
  using (
    id = auth.uid()
    or (
      role = 'patient'
      and app_private.current_user_role() = 'doctor'
      and exists (
        select 1
        from public.doctor_patient_access access
        where access.doctor_id = auth.uid()
          and access.patient_id = user_profiles.id
          and access.active = true
          and access.revoked_at is null
      )
    )
  );

drop policy if exists "profiles_insert_own_patient" on public.user_profiles;
create policy "profiles_insert_own_patient"
  on public.user_profiles for insert
  to authenticated
  with check (id = auth.uid() and role = 'patient');

drop policy if exists "profiles_update_own" on public.user_profiles;
create policy "profiles_update_own"
  on public.user_profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "baseline_select_own_or_linked_doctor" on public.patient_baseline_profiles;
create policy "baseline_select_own_or_linked_doctor"
  on public.patient_baseline_profiles for select
  to authenticated
  using (patient_id = auth.uid() or app_private.is_linked_doctor(patient_id));

drop policy if exists "baseline_insert_own" on public.patient_baseline_profiles;
create policy "baseline_insert_own"
  on public.patient_baseline_profiles for insert
  to authenticated
  with check (patient_id = auth.uid() and app_private.current_user_role() = 'patient');

drop policy if exists "baseline_update_own" on public.patient_baseline_profiles;
create policy "baseline_update_own"
  on public.patient_baseline_profiles for update
  to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

drop policy if exists "entries_select_own_or_linked_doctor" on public.patient_entries;
create policy "entries_select_own_or_linked_doctor"
  on public.patient_entries for select
  to authenticated
  using (patient_id = auth.uid() or app_private.is_linked_doctor(patient_id));

drop policy if exists "entries_insert_own" on public.patient_entries;
create policy "entries_insert_own"
  on public.patient_entries for insert
  to authenticated
  with check (patient_id = auth.uid() and app_private.current_user_role() = 'patient');

drop policy if exists "entries_update_own" on public.patient_entries;
create policy "entries_update_own"
  on public.patient_entries for update
  to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

drop policy if exists "entries_delete_own" on public.patient_entries;
create policy "entries_delete_own"
  on public.patient_entries for delete
  to authenticated
  using (patient_id = auth.uid());

drop policy if exists "photos_select_own_or_linked_doctor" on public.entry_photos;
create policy "photos_select_own_or_linked_doctor"
  on public.entry_photos for select
  to authenticated
  using (patient_id = auth.uid() or app_private.is_linked_doctor(patient_id));

drop policy if exists "photos_insert_own" on public.entry_photos;
create policy "photos_insert_own"
  on public.entry_photos for insert
  to authenticated
  with check (
    patient_id = auth.uid()
    and app_private.patient_owns_entry(entry_id)
    and photo_path not like '%base64%'
    and thumbnail_path not like '%base64%'
  );

drop policy if exists "photos_update_own" on public.entry_photos;
create policy "photos_update_own"
  on public.entry_photos for update
  to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid() and app_private.patient_owns_entry(entry_id));

drop policy if exists "photos_delete_own" on public.entry_photos;
create policy "photos_delete_own"
  on public.entry_photos for delete
  to authenticated
  using (patient_id = auth.uid());

drop policy if exists "invite_codes_select_own_doctor" on public.doctor_invite_codes;
create policy "invite_codes_select_own_doctor"
  on public.doctor_invite_codes for select
  to authenticated
  using (doctor_id = auth.uid());

drop policy if exists "invite_codes_insert_own_doctor" on public.doctor_invite_codes;
create policy "invite_codes_insert_own_doctor"
  on public.doctor_invite_codes for insert
  to authenticated
  with check (doctor_id = auth.uid() and app_private.current_user_role() = 'doctor');

drop policy if exists "invite_codes_update_own_unused_doctor" on public.doctor_invite_codes;
create policy "invite_codes_update_own_unused_doctor"
  on public.doctor_invite_codes for update
  to authenticated
  using (doctor_id = auth.uid() and redeemed_at is null)
  with check (doctor_id = auth.uid());

drop policy if exists "access_select_doctor_or_patient" on public.doctor_patient_access;
create policy "access_select_doctor_or_patient"
  on public.doctor_patient_access for select
  to authenticated
  using (doctor_id = auth.uid() or patient_id = auth.uid());

drop policy if exists "exports_select_own_doctor" on public.export_requests;
create policy "exports_select_own_doctor"
  on public.export_requests for select
  to authenticated
  using (doctor_id = auth.uid());

drop policy if exists "exports_insert_linked_doctor" on public.export_requests;
create policy "exports_insert_linked_doctor"
  on public.export_requests for insert
  to authenticated
  with check (
    doctor_id = auth.uid()
    and app_private.current_user_role() = 'doctor'
    and app_private.is_linked_doctor(patient_id)
  );

drop policy if exists "audit_insert_self" on public.audit_events;
create policy "audit_insert_self"
  on public.audit_events for insert
  to authenticated
  with check (actor_id = auth.uid());

drop policy if exists "daily_select_own_or_linked_doctor" on public.daily_form_details;
create policy "daily_select_own_or_linked_doctor"
  on public.daily_form_details for select
  to authenticated
  using (app_private.patient_owns_entry(entry_id) or app_private.doctor_can_read_entry(entry_id));

drop policy if exists "daily_insert_own" on public.daily_form_details;
create policy "daily_insert_own"
  on public.daily_form_details for insert
  to authenticated
  with check (app_private.patient_owns_entry(entry_id));

drop policy if exists "daily_update_own" on public.daily_form_details;
create policy "daily_update_own"
  on public.daily_form_details for update
  to authenticated
  using (app_private.patient_owns_entry(entry_id))
  with check (app_private.patient_owns_entry(entry_id));

drop policy if exists "daily_delete_own" on public.daily_form_details;
create policy "daily_delete_own"
  on public.daily_form_details for delete
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

drop policy if exists "symptom_select_own_or_linked_doctor" on public.symptom_details;
create policy "symptom_select_own_or_linked_doctor"
  on public.symptom_details for select
  to authenticated
  using (app_private.patient_owns_entry(entry_id) or app_private.doctor_can_read_entry(entry_id));

drop policy if exists "symptom_insert_own" on public.symptom_details;
create policy "symptom_insert_own"
  on public.symptom_details for insert
  to authenticated
  with check (app_private.patient_owns_entry(entry_id));

drop policy if exists "symptom_update_own" on public.symptom_details;
create policy "symptom_update_own"
  on public.symptom_details for update
  to authenticated
  using (app_private.patient_owns_entry(entry_id))
  with check (app_private.patient_owns_entry(entry_id));

drop policy if exists "symptom_delete_own" on public.symptom_details;
create policy "symptom_delete_own"
  on public.symptom_details for delete
  to authenticated
  using (app_private.patient_owns_entry(entry_id));

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

drop policy if exists "menstruation_select_own_or_linked_doctor" on public.menstruation_events;
create policy "menstruation_select_own_or_linked_doctor"
  on public.menstruation_events for select
  to authenticated
  using (app_private.patient_owns_entry(entry_id) or app_private.doctor_can_read_entry(entry_id));

drop policy if exists "menstruation_insert_own" on public.menstruation_events;
create policy "menstruation_insert_own"
  on public.menstruation_events for insert
  to authenticated
  with check (app_private.patient_owns_entry(entry_id));

drop policy if exists "menstruation_update_own" on public.menstruation_events;
create policy "menstruation_update_own"
  on public.menstruation_events for update
  to authenticated
  using (app_private.patient_owns_entry(entry_id))
  with check (app_private.patient_owns_entry(entry_id));

drop policy if exists "menstruation_delete_own" on public.menstruation_events;
create policy "menstruation_delete_own"
  on public.menstruation_events for delete
  to authenticated
  using (app_private.patient_owns_entry(entry_id));
