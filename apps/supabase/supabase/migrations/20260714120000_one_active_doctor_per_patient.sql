-- V1 product rule: one active gastro doctor link per patient.
-- Patients may still re-link after an access row is deactivated/revoked by an operator.

create unique index if not exists doctor_patient_access_one_active_patient_uidx
  on public.doctor_patient_access (patient_id)
  where active = true and revoked_at is null;

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

  if exists (
    select 1
    from public.doctor_patient_access access
    where access.patient_id = auth.uid()
      and access.active = true
      and access.revoked_at is null
  ) then
    raise exception 'patient already has an active doctor link' using errcode = '22023';
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
