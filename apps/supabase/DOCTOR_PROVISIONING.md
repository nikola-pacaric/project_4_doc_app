# Manual Doctor Provisioning

V1 has patient signup and login, but doctor login only. Doctor accounts are created manually by an operator/admin in Supabase.

## Required Behavior

- Doctor accounts must have a normal Supabase Auth user.
- Doctor profiles must be inserted into `public.user_profiles` with `role = 'doctor'`.
- Doctor role assignment must happen admin-side.
- The app must not expose public doctor signup.
- Role changes are blocked by the `prevent_user_profile_role_change` trigger after profile creation.

## Example SQL

Preferred admin-side flow:

1. Create the doctor user in Supabase Auth.
2. Set admin-controlled app metadata to:

```json
{
  "app_role": "doctor"
}
```

The Auth trigger will create `public.user_profiles.role = 'doctor'`. Public patient signup cannot set this because it lives in app metadata, not user metadata.

Fallback SQL flow after creating the doctor user and copying that user's UUID:

```sql
delete from public.user_profiles
where id = 'doctor-auth-user-id-here';

insert into public.user_profiles (id, role, display_name)
values ('doctor-auth-user-id-here', 'doctor', 'Doctor Display Name');
```

Do not put service-role or secret keys in web/mobile env files.
