alter table public.exercise_details
  drop constraint if exists exercise_details_duration_minutes_check;

alter table public.exercise_details
  drop constraint if exists exercise_details_intensity_check;

alter table public.exercise_details
  drop constraint if exists exercise_details_required_fields_check;

alter table public.exercise_details
  add constraint exercise_details_duration_minutes_check
  check (duration_minutes between 1 and 1440) not valid;

alter table public.exercise_details
  add constraint exercise_details_intensity_check
  check (intensity in ('light', 'moderate', 'vigorous')) not valid;

-- Existing draft rows cannot be safely inferred. New and updated rows are still checked.
alter table public.exercise_details
  add constraint exercise_details_required_fields_check
  check (
    nullif(btrim(activity), '') is not null
    and duration_minutes is not null
    and intensity is not null
  ) not valid;

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
