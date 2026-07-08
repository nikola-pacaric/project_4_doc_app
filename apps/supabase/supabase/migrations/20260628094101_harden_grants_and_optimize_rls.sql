-- Tighten public API grants and optimize RLS auth helper calls.

revoke all privileges on table
  public.user_profiles,
  public.patient_baseline_profiles,
  public.patient_entries,
  public.daily_form_details,
  public.food_form_details,
  public.meal_details,
  public.symptom_details,
  public.stool_details,
  public.medication_details,
  public.exercise_details,
  public.menstruation_events,
  public.entry_photos,
  public.doctor_invite_codes,
  public.doctor_patient_access,
  public.export_requests,
  public.audit_events
from anon;

revoke execute on function public.create_doctor_invite_code() from anon, public;
revoke execute on function public.revoke_doctor_invite_code(uuid) from anon, public;
revoke execute on function public.complete_patient_daily_form(uuid) from anon, public;
revoke execute on function public.save_patient_food_form(
  timestamptz,
  timestamptz,
  timestamptz,
  numeric,
  boolean,
  text,
  jsonb
) from anon, public;
revoke execute on function public.save_patient_symptoms(timestamptz, timestamptz, jsonb)
from anon, public;
revoke execute on function public.save_patient_exercise(uuid, timestamptz, text, integer, text, text)
from anon, public;
revoke execute on function public.save_patient_stool(
  uuid,
  timestamptz,
  integer,
  text,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  text
) from anon, public;
revoke execute on function public.save_patient_medication(uuid, timestamptz, text, text, text, boolean)
from anon, public;
revoke execute on function public.save_patient_menstruation(uuid, timestamptz, text, integer, text)
from anon, public;
revoke execute on function public.save_patient_note(uuid, timestamptz, text) from anon, public;

grant execute on function public.create_doctor_invite_code() to authenticated;
grant execute on function public.revoke_doctor_invite_code(uuid) to authenticated;
grant execute on function public.complete_patient_daily_form(uuid) to authenticated;
grant execute on function public.save_patient_food_form(
  timestamptz,
  timestamptz,
  timestamptz,
  numeric,
  boolean,
  text,
  jsonb
) to authenticated;
grant execute on function public.save_patient_symptoms(timestamptz, timestamptz, jsonb)
to authenticated;
grant execute on function public.save_patient_exercise(uuid, timestamptz, text, integer, text, text)
to authenticated;
grant execute on function public.save_patient_stool(
  uuid,
  timestamptz,
  integer,
  text,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  text
) to authenticated;
grant execute on function public.save_patient_medication(uuid, timestamptz, text, text, text, boolean)
to authenticated;
grant execute on function public.save_patient_menstruation(uuid, timestamptz, text, integer, text)
to authenticated;
grant execute on function public.save_patient_note(uuid, timestamptz, text) to authenticated;

alter policy "profiles_select_own_or_linked_patient"
  on public.user_profiles
  using (
    id = (select auth.uid())
    or (
      role = 'patient'::public.user_role
      and (select app_private.current_user_role()) = 'doctor'::public.user_role
      and exists (
        select 1
        from public.doctor_patient_access access
        where access.doctor_id = (select auth.uid())
          and access.patient_id = user_profiles.id
          and access.active = true
          and access.revoked_at is null
      )
    )
  );

alter policy "profiles_insert_own_patient"
  on public.user_profiles
  with check (id = (select auth.uid()) and role = 'patient'::public.user_role);

alter policy "profiles_update_own"
  on public.user_profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter policy "baseline_select_own_or_linked_doctor"
  on public.patient_baseline_profiles
  using (
    patient_id = (select auth.uid())
    or exists (
      select 1
      from public.doctor_patient_access access
      where access.doctor_id = (select auth.uid())
        and access.patient_id = patient_baseline_profiles.patient_id
        and access.active = true
        and access.revoked_at is null
    )
  );

alter policy "baseline_insert_own"
  on public.patient_baseline_profiles
  with check (
    patient_id = (select auth.uid())
    and (select app_private.current_user_role()) = 'patient'::public.user_role
  );

alter policy "baseline_update_own"
  on public.patient_baseline_profiles
  using (patient_id = (select auth.uid()))
  with check (patient_id = (select auth.uid()));

alter policy "entries_select_own_or_linked_doctor"
  on public.patient_entries
  using (
    patient_id = (select auth.uid())
    or exists (
      select 1
      from public.doctor_patient_access access
      where access.doctor_id = (select auth.uid())
        and access.patient_id = patient_entries.patient_id
        and access.active = true
        and access.revoked_at is null
    )
  );

alter policy "entries_insert_own"
  on public.patient_entries
  with check (
    patient_id = (select auth.uid())
    and (select app_private.current_user_role()) = 'patient'::public.user_role
  );

alter policy "entries_update_own"
  on public.patient_entries
  using (patient_id = (select auth.uid()))
  with check (patient_id = (select auth.uid()));

alter policy "entries_delete_own"
  on public.patient_entries
  using (patient_id = (select auth.uid()));

alter policy "photos_select_own_or_linked_doctor"
  on public.entry_photos
  using (
    patient_id = (select auth.uid())
    or exists (
      select 1
      from public.doctor_patient_access access
      where access.doctor_id = (select auth.uid())
        and access.patient_id = entry_photos.patient_id
        and access.active = true
        and access.revoked_at is null
    )
  );

alter policy "photos_insert_own"
  on public.entry_photos
  with check (
    patient_id = (select auth.uid())
    and app_private.patient_owns_entry(entry_id)
    and photo_path not like '%base64%'
    and thumbnail_path not like '%base64%'
  );

alter policy "photos_update_own"
  on public.entry_photos
  using (patient_id = (select auth.uid()))
  with check (
    patient_id = (select auth.uid())
    and app_private.patient_owns_entry(entry_id)
  );

alter policy "photos_delete_own"
  on public.entry_photos
  using (patient_id = (select auth.uid()));

alter policy "invite_codes_select_own_doctor"
  on public.doctor_invite_codes
  using (doctor_id = (select auth.uid()));

alter policy "invite_codes_insert_own_doctor"
  on public.doctor_invite_codes
  with check (
    doctor_id = (select auth.uid())
    and (select app_private.current_user_role()) = 'doctor'::public.user_role
  );

alter policy "invite_codes_update_own_unused_doctor"
  on public.doctor_invite_codes
  using (doctor_id = (select auth.uid()) and redeemed_at is null)
  with check (doctor_id = (select auth.uid()));

alter policy "access_select_doctor_or_patient"
  on public.doctor_patient_access
  using (doctor_id = (select auth.uid()) or patient_id = (select auth.uid()));

alter policy "exports_select_own_doctor"
  on public.export_requests
  using (doctor_id = (select auth.uid()));

alter policy "exports_insert_linked_doctor"
  on public.export_requests
  with check (
    doctor_id = (select auth.uid())
    and (select app_private.current_user_role()) = 'doctor'::public.user_role
    and exists (
      select 1
      from public.doctor_patient_access access
      where access.doctor_id = (select auth.uid())
        and access.patient_id = export_requests.patient_id
        and access.active = true
        and access.revoked_at is null
    )
  );

alter policy "audit_insert_self"
  on public.audit_events
  with check (actor_id = (select auth.uid()));
