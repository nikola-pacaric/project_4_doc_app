revoke all privileges on table public.food_form_details from anon, authenticated;
grant select, insert, update, delete on table public.food_form_details to authenticated;
