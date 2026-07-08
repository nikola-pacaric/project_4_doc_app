alter table public.symptom_details
  rename column sleep_interruption to woke_from_sleep;

alter table public.symptom_details
  add column if not exists symptom_type text,
  add column if not exists custom_type text,
  add column if not exists pain_location_custom text,
  add column if not exists pain_radiates boolean,
  add column if not exists pain_description_custom text;

alter table public.symptom_details
  drop constraint if exists symptom_details_symptom_type_check,
  drop constraint if exists symptom_details_required_fields_check,
  drop constraint if exists symptom_details_custom_type_check,
  drop constraint if exists symptom_details_pain_location_check,
  drop constraint if exists symptom_details_pain_description_check,
  drop constraint if exists symptom_details_pain_fields_check;

alter table public.symptom_details
  add constraint symptom_details_symptom_type_check
  check (
    symptom_type in (
      'bloating', 'pain', 'gas', 'stomach_burning', 'heartburn', 'regurgitation',
      'early_satiety', 'belching', 'nausea', 'vomiting', 'blood_present',
      'stomach_heaviness', 'difficulty_swallowing', 'painful_swallowing',
      'false_urge_to_defecate', 'other'
    )
  ),
  add constraint symptom_details_required_fields_check
  check (
    symptom_type is not null
    and started_at is not null
    and intensity is not null
    and woke_from_sleep is not null
  ) not valid,
  add constraint symptom_details_custom_type_check
  check (
    symptom_type <> 'other'
    or nullif(btrim(custom_type), '') is not null
  ),
  add constraint symptom_details_pain_location_check
  check (
    pain_location is null
    or pain_location in (
      'upper_abdomen', 'lower_abdomen', 'left_abdomen', 'right_abdomen',
      'whole_abdomen', 'chest', 'throat', 'other'
    )
  ),
  add constraint symptom_details_pain_description_check
  check (
    pain_description is null
    or pain_description in (
      'cramping', 'burning', 'sharp', 'dull', 'pressure', 'stabbing', 'throbbing', 'other'
    )
  ),
  add constraint symptom_details_pain_fields_check
  check (
    symptom_type <> 'pain'
    or (
      pain_location is not null
      and (pain_location <> 'other' or nullif(btrim(pain_location_custom), '') is not null)
      and pain_radiates is not null
      and (not pain_radiates or nullif(btrim(pain_radiation), '') is not null)
      and pain_description is not null
      and (
        pain_description <> 'other'
        or nullif(btrim(pain_description_custom), '') is not null
      )
    )
  );

comment on column public.symptom_details.intake_list is
  'Deprecated Phase 4 draft field. Meals and medication are correlated through their own timestamps.';

comment on column public.symptom_details.quality_of_life_effect is
  'Deprecated Phase 4 draft field. Intensity level 3 carries significant quality-of-life impact.';

comment on column public.symptom_details.custom_description is
  'Deprecated Phase 4 draft field. Use custom_type and pain_description_custom.';
