create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, role, display_name)
  values (
    new.id,
    case
      when new.raw_app_meta_data ->> 'app_role' = 'doctor' then 'doctor'::public.user_role
      else 'patient'::public.user_role
    end,
    nullif(coalesce(new.raw_user_meta_data ->> 'display_name', ''), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

