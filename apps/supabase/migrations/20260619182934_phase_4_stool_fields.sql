alter table public.stool_details
  drop constraint if exists stool_details_required_fields_check;

alter table public.stool_details
  add column if not exists urgency_level text;

alter table public.stool_details
  drop constraint if exists stool_details_urgency_level_check;

alter table public.stool_details
  add constraint stool_details_urgency_level_check
  check (urgency_level in ('none', 'mild', 'moderate', 'severe'));

-- Existing draft rows cannot be safely inferred. New and updated rows are still checked.
alter table public.stool_details
  add constraint stool_details_required_fields_check
  check (
    bristol_type is not null
    and urgency is not null
    and urgency_level is not null
    and pain is not null
    and mucus is not null
    and blood is not null
    and fatty_stool is not null
    and black_stool is not null
  ) not valid;

alter table public.stool_details enable row level security;

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
