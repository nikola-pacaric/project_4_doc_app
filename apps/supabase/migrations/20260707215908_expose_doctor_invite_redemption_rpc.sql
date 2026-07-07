create or replace function public.redeem_doctor_invite_code(invite_code text)
returns uuid
language sql
security invoker
set search_path = public, app_private
as $$
  select app_private.redeem_doctor_invite_code(invite_code)
$$;

revoke execute on function public.redeem_doctor_invite_code(text) from anon, public;
grant execute on function public.redeem_doctor_invite_code(text) to authenticated;
