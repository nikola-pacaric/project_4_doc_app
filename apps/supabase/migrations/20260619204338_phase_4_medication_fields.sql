alter table public.medication_details
  add column if not exists is_chronic_therapy boolean;

alter table public.medication_details
  drop constraint if exists medication_details_required_fields_check;

-- Existing draft rows cannot be safely inferred. New and updated rows are still checked.
alter table public.medication_details
  add constraint medication_details_required_fields_check
  check (
    nullif(btrim(name), '') is not null
    and nullif(btrim(dose), '') is not null
    and is_chronic_therapy is not null
  ) not valid;

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
