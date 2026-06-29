alter table public.food_form_details
  alter column water_liters type numeric
  using round(water_liters, 2);

alter table public.food_form_details
  drop constraint if exists food_form_details_water_liters_check;

alter table public.food_form_details
  add constraint food_form_details_water_liters_check
  check (
    water_liters >= 0
    and water_liters <= 20
    and water_liters = round(water_liters, 2)
  );
