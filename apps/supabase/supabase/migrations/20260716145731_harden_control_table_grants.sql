-- Keep control-table reads available where the app needs them, but force every
-- invite, link, export, and audit mutation through a caller-validating function.

revoke all privileges on table
  public.doctor_invite_codes,
  public.doctor_patient_access,
  public.export_requests,
  public.audit_events
from anon, authenticated;

grant select on table
  public.doctor_invite_codes,
  public.doctor_patient_access,
  public.export_requests
to authenticated;

drop policy if exists "invite_codes_insert_own_doctor" on public.doctor_invite_codes;
drop policy if exists "invite_codes_update_own_unused_doctor" on public.doctor_invite_codes;
drop policy if exists "exports_insert_linked_doctor" on public.export_requests;
drop policy if exists "audit_insert_self" on public.audit_events;

create or replace function app_private.create_doctor_invite_code()
returns table (id uuid, code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_code text;
begin
  if auth.uid() is null
    or app_private.current_user_role() <> 'doctor'::public.user_role then
    raise exception 'only doctors can create invite codes' using errcode = '42501';
  end if;

  generated_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  return query
  insert into public.doctor_invite_codes as invite (doctor_id, code)
  values (auth.uid(), generated_code)
  returning invite.id, invite.code, invite.expires_at;
end;
$$;

create or replace function app_private.revoke_doctor_invite_code(invite_code_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  if auth.uid() is null
    or app_private.current_user_role() <> 'doctor'::public.user_role then
    raise exception 'only doctors can revoke invite codes' using errcode = '42501';
  end if;

  update public.doctor_invite_codes as invite
  set revoked_at = now()
  where invite.id = invite_code_id
    and invite.doctor_id = auth.uid()
    and invite.revoked_at is null
    and invite.redeemed_at is null;

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

create or replace function public.create_doctor_invite_code()
returns table (id uuid, code text, expires_at timestamptz)
language sql
security invoker
set search_path = ''
as $$
  select * from app_private.create_doctor_invite_code()
$$;

create or replace function public.revoke_doctor_invite_code(invite_code_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select app_private.revoke_doctor_invite_code(invite_code_id)
$$;

revoke execute on function app_private.create_doctor_invite_code()
from public, anon, authenticated;
revoke execute on function app_private.revoke_doctor_invite_code(uuid)
from public, anon, authenticated;
revoke execute on function app_private.redeem_doctor_invite_code(text)
from public, anon, authenticated;
revoke execute on function app_private.export_patient_data(
  uuid,
  public.export_mode,
  public.export_range_type,
  date,
  date
) from public, anon, authenticated;

grant execute on function app_private.create_doctor_invite_code() to authenticated;
grant execute on function app_private.revoke_doctor_invite_code(uuid) to authenticated;
grant execute on function app_private.redeem_doctor_invite_code(text) to authenticated;
grant execute on function app_private.export_patient_data(
  uuid,
  public.export_mode,
  public.export_range_type,
  date,
  date
) to authenticated;

revoke execute on function public.create_doctor_invite_code()
from public, anon, authenticated;
revoke execute on function public.revoke_doctor_invite_code(uuid)
from public, anon, authenticated;
revoke execute on function public.redeem_doctor_invite_code(text)
from public, anon, authenticated;
revoke execute on function public.export_patient_data(
  uuid,
  public.export_mode,
  public.export_range_type,
  date,
  date
) from public, anon, authenticated;

grant execute on function public.create_doctor_invite_code() to authenticated;
grant execute on function public.revoke_doctor_invite_code(uuid) to authenticated;
grant execute on function public.redeem_doctor_invite_code(text) to authenticated;
grant execute on function public.export_patient_data(
  uuid,
  public.export_mode,
  public.export_range_type,
  date,
  date
) to authenticated;
