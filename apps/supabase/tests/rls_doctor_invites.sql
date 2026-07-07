begin;

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  created_at,
  updated_at
)
values
  ('00000000-0000-4000-8000-000000000071', 'authenticated', 'authenticated', 'invite_patient_a@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000072', 'authenticated', 'authenticated', 'invite_patient_b@example.test', 'test', now(), '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000073', 'authenticated', 'authenticated', 'invite_doctor_a@example.test', 'test', now(), '{"app_role":"doctor"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000074', 'authenticated', 'authenticated', 'invite_doctor_b@example.test', 'test', now(), '{"app_role":"doctor"}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.user_profiles (id, role, display_name)
values
  ('00000000-0000-4000-8000-000000000071', 'patient', 'Invite Patient A'),
  ('00000000-0000-4000-8000-000000000072', 'patient', 'Invite Patient B'),
  ('00000000-0000-4000-8000-000000000073', 'doctor', 'Invite Doctor A'),
  ('00000000-0000-4000-8000-000000000074', 'doctor', 'Invite Doctor B')
on conflict (id) do nothing;

create temp table invite_test_state (
  key text primary key,
  invite_id uuid,
  invite_code text,
  access_id uuid
) on commit drop;

grant all on invite_test_state to authenticated;

set local role anon;

do $$
begin
  begin
    perform public.redeem_doctor_invite_code('INVALID');
    raise exception 'anonymous users should not execute invite redemption';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000071';

do $$
declare
  visible_invites integer;
begin
  select count(*) into visible_invites from public.doctor_invite_codes;
  if visible_invites <> 0 then
    raise exception 'patients should not see doctor invite rows, saw %', visible_invites;
  end if;

  begin
    perform public.create_doctor_invite_code();
    raise exception 'patients should not create doctor invite codes';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.revoke_doctor_invite_code('00000000-0000-4000-8000-000000000000');
    raise exception 'patients should not revoke doctor invite codes';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000073';

do $$
declare
  created record;
  visible_invites integer;
  revoked boolean;
begin
  select * into created from public.create_doctor_invite_code();

  if created.code !~ '^[A-Z0-9]{10}$' then
    raise exception 'generated invite code should be 10 uppercase alphanumeric chars, got %', created.code;
  end if;

  if created.expires_at <= now() + interval '6 days 23 hours'
    or created.expires_at > now() + interval '7 days 1 hour' then
    raise exception 'generated invite code should expire around 7 days from creation';
  end if;

  insert into invite_test_state (key, invite_id, invite_code)
  values ('active', created.id, created.code);

  select count(*) into visible_invites from public.doctor_invite_codes;
  if visible_invites <> 1 then
    raise exception 'doctor A should see exactly one own invite, saw %', visible_invites;
  end if;

  revoked := public.revoke_doctor_invite_code(created.id);
  if revoked is not true then
    raise exception 'doctor A should revoke an own unused invite';
  end if;

  revoked := public.revoke_doctor_invite_code(created.id);
  if revoked is not false then
    raise exception 'doctor A should not revoke an already revoked invite again';
  end if;

  select * into created from public.create_doctor_invite_code();

  insert into invite_test_state (key, invite_id, invite_code)
  values ('redeemable', created.id, created.code);
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000074';

do $$
declare
  visible_invites integer;
  revoked boolean;
begin
  select count(*) into visible_invites from public.doctor_invite_codes;
  if visible_invites <> 0 then
    raise exception 'doctor B should not see doctor A invite rows, saw %', visible_invites;
  end if;

  select public.revoke_doctor_invite_code(invite_id)
  into revoked
  from invite_test_state
  where key = 'redeemable';

  if revoked is not false then
    raise exception 'doctor B should not revoke doctor A invite';
  end if;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000071';

do $$
declare
  redeemed_access_id uuid;
  linked_rows integer;
begin
  select public.redeem_doctor_invite_code(invite_code)
  into redeemed_access_id
  from invite_test_state
  where key = 'redeemable';

  update invite_test_state
  set access_id = redeemed_access_id
  where key = 'redeemable';

  select count(*) into linked_rows
  from public.doctor_patient_access
  where id = redeemed_access_id
    and doctor_id = '00000000-0000-4000-8000-000000000073'
    and patient_id = '00000000-0000-4000-8000-000000000071'
    and active = true
    and revoked_at is null;

  if linked_rows <> 1 then
    raise exception 'redeeming a valid invite should create one active doctor-patient access row';
  end if;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000072';

do $$
begin
  begin
    perform public.redeem_doctor_invite_code(invite_code)
    from invite_test_state
    where key = 'redeemable';
    raise exception 'used invite codes should reject reuse';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform public.redeem_doctor_invite_code(invite_code)
    from invite_test_state
    where key = 'active';
    raise exception 'revoked invite codes should reject redemption';
  exception when invalid_parameter_value then null;
  end;
end $$;

reset role;

insert into public.doctor_invite_codes (
  id,
  doctor_id,
  code,
  created_at,
  expires_at
)
values (
  '20000000-0000-4000-8000-000000000071',
  '00000000-0000-4000-8000-000000000073',
  'EXPIRED071',
  now() - interval '8 days',
  now() - interval '1 day'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000072';

do $$
begin
  begin
    perform public.redeem_doctor_invite_code('EXPIRED071');
    raise exception 'expired invite codes should reject redemption';
  exception when invalid_parameter_value then null;
  end;
end $$;

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000073';

do $$
declare
  revoked boolean;
begin
  begin
    perform public.redeem_doctor_invite_code('EXPIRED071');
    raise exception 'doctors should not redeem invite codes';
  exception when insufficient_privilege then null;
  end;

  select public.revoke_doctor_invite_code(invite_id)
  into revoked
  from invite_test_state
  where key = 'redeemable';

  if revoked is not false then
    raise exception 'doctor should not revoke an already redeemed invite';
  end if;
end $$;

reset role;

rollback;
