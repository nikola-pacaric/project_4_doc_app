alter table public.menstruation_events
  drop constraint if exists menstruation_events_flow_check;

alter table public.menstruation_events
  drop constraint if exists menstruation_events_pain_level_check;

alter table public.menstruation_events
  drop constraint if exists menstruation_events_required_fields_check;

alter table public.menstruation_events
  add constraint menstruation_events_flow_check
  check (flow in ('light', 'moderate', 'heavy')) not valid;

alter table public.menstruation_events
  add constraint menstruation_events_pain_level_check
  check (pain_level between 1 and 3) not valid;

-- Existing draft rows cannot be safely inferred. New and updated rows are still checked.
alter table public.menstruation_events
  add constraint menstruation_events_required_fields_check
  check (flow is not null and pain_level is not null) not valid;

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
