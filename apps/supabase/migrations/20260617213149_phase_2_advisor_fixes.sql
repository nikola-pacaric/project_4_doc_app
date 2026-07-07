create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_user_profile_role_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.role is distinct from new.role then
    raise exception 'user profile role is immutable' using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = app_private
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create index if not exists audit_events_actor_id_idx
  on public.audit_events (actor_id);

create index if not exists doctor_invite_codes_redeemed_by_patient_id_idx
  on public.doctor_invite_codes (redeemed_by_patient_id);

create index if not exists doctor_patient_access_invite_code_id_idx
  on public.doctor_patient_access (invite_code_id);

create index if not exists doctor_patient_access_patient_id_idx
  on public.doctor_patient_access (patient_id);

create index if not exists entry_photos_entry_id_idx
  on public.entry_photos (entry_id);

create index if not exists export_requests_patient_id_idx
  on public.export_requests (patient_id);

