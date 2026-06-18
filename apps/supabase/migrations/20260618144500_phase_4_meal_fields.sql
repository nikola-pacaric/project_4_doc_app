alter table public.meal_details
  add column if not exists meal_type text,
  add column if not exists name text;

alter table public.meal_details
  drop constraint if exists meal_details_meal_type_check;

alter table public.meal_details
  add constraint meal_details_meal_type_check
  check (meal_type is null or meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'other'));

alter table public.daily_form_details
  add column if not exists has_other_fluids boolean,
  add column if not exists had_physical_activity boolean,
  add column if not exists took_medication_outside_chronic_therapy boolean,
  add column if not exists had_menstruation boolean,
  add column if not exists had_naps boolean,
  add column if not exists has_additional_notes boolean,
  add column if not exists completed_at timestamptz;
