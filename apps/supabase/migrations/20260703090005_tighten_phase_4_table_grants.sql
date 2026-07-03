revoke all privileges on table
  public.user_profiles,
  public.patient_baseline_profiles,
  public.patient_entries,
  public.daily_form_details,
  public.food_form_details,
  public.meal_details,
  public.other_fluid_details,
  public.symptom_details,
  public.stool_details,
  public.medication_details,
  public.exercise_details,
  public.menstruation_events
from anon, authenticated;

grant select, insert, update on table
  public.user_profiles,
  public.patient_baseline_profiles
  to authenticated;

grant select, insert, update, delete on table
  public.patient_entries,
  public.daily_form_details,
  public.food_form_details,
  public.meal_details,
  public.other_fluid_details,
  public.symptom_details,
  public.stool_details,
  public.medication_details,
  public.exercise_details,
  public.menstruation_events
  to authenticated;
