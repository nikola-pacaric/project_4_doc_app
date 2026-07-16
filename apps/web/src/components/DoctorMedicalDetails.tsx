import type { PatientBaselineProfile } from '@project4/contracts';
import { parseRecentMajorWeightChange } from '@project4/forms';
import { t, type Locale, type TranslationKey } from '@project4/i18n';
import type { DoctorTimelineEntry } from '@project4/supabase-client';

interface DetailField {
  label: string;
  value: string | number | null;
}

function translatedValue(
  locale: Locale,
  prefix: string,
  value: string | number | null,
): string | null {
  return value === null ? null : t(locale, `${prefix}.${value}` as TranslationKey);
}

function booleanValue(locale: Locale, value: boolean | null): string | null {
  return value === null ? null : t(locale, value ? 'common.yes' : 'common.no');
}

function formatDateTime(locale: Locale, value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function visibleValue(locale: Locale, value: string | number | null): string {
  if (value === null || value === '') return t(locale, 'doctor.notRecorded');
  return String(value);
}

function baselineFields(locale: Locale, baseline: PatientBaselineProfile): DetailField[] {
  const weightChange = parseRecentMajorWeightChange(baseline.recentMajorWeightChange);
  const weightChangeValue = weightChange.recentMajorWeightChange
    ? [
        t(locale, weightChange.recentMajorWeightChange === 'yes' ? 'common.yes' : 'common.no'),
        weightChange.recentMajorWeightChangeDescription,
      ]
        .filter(Boolean)
        .join(' - ')
    : null;

  return [
    {
      label: t(locale, 'baseline.sex'),
      value: baseline.sex
        ? t(
            locale,
            {
              female: 'baseline.sexFemale',
              male: 'baseline.sexMale',
              other: 'baseline.sexOther',
              prefer_not_to_say: 'baseline.sexPreferNot',
            }[baseline.sex] as TranslationKey,
          )
        : null,
    },
    { label: t(locale, 'baseline.birthYear'), value: baseline.birthYear },
    { label: t(locale, 'baseline.occupation'), value: baseline.occupation },
    { label: t(locale, 'baseline.chronicDiseases'), value: baseline.chronicDiseases },
    { label: t(locale, 'baseline.chronicTherapy'), value: baseline.chronicTherapy },
    ...(baseline.sex === 'female' || baseline.menstrualHistory
      ? [{ label: t(locale, 'baseline.menstrualHistory'), value: baseline.menstrualHistory }]
      : []),
    {
      label: t(locale, 'baseline.weightKg'),
      value: baseline.weightKg === null ? null : `${baseline.weightKg} kg`,
    },
    {
      label: t(locale, 'baseline.heightCm'),
      value: baseline.heightCm === null ? null : `${baseline.heightCm} cm`,
    },
    { label: t(locale, 'baseline.recentWeightChange'), value: weightChangeValue },
    {
      label: t(locale, 'doctor.weightReminderDue'),
      value: formatDateTime(locale, baseline.weightReminderDueAt),
    },
    {
      label: t(locale, 'doctor.profileUpdated'),
      value: formatDateTime(locale, baseline.updatedAt),
    },
  ];
}

function entryFields(locale: Locale, entry: DoctorTimelineEntry): DetailField[] {
  const details = entry.medicalDetails;

  if (details.daily) {
    const daily = details.daily;
    const food = details.food;
    return [
      {
        label: t(locale, 'doctor.dailyStatus'),
        value: t(locale, daily.completedAt ? 'daily.statusComplete' : 'daily.statusDraft'),
      },
      { label: t(locale, 'daily.wakeTime'), value: daily.wakeTime },
      { label: t(locale, 'daily.sleepDuration'), value: daily.sleepDuration },
      {
        label: t(locale, 'daily.appetite'),
        value: translatedValue(locale, 'daily.appetite', daily.appetite),
      },
      {
        label: t(locale, 'daily.activityNotes'),
        value: booleanValue(locale, daily.hadPhysicalActivity),
      },
      {
        label: t(locale, 'daily.chronicTherapyTaken'),
        value: booleanValue(locale, daily.tookChronicTherapy),
      },
      {
        label: t(locale, 'daily.medication'),
        value: booleanValue(locale, daily.tookMedicationOutsideChronicTherapy),
      },
      ...(daily.tookMedicationOutsideChronicTherapy
        ? [
            {
              label: t(locale, 'daily.medicationDetails'),
              value: daily.medicationOutsideChronicTherapy,
            },
          ]
        : []),
      ...(daily.hadMenstruation !== null
        ? [
            {
              label: t(locale, 'daily.menstruation'),
              value: booleanValue(locale, daily.hadMenstruation),
            },
          ]
        : []),
      ...(daily.menstruationNotes
        ? [{ label: t(locale, 'daily.menstruationDetails'), value: daily.menstruationNotes }]
        : []),
      { label: t(locale, 'daily.naps'), value: booleanValue(locale, daily.hadNaps) },
      ...(daily.hadNaps ? [{ label: t(locale, 'daily.napsDetails'), value: daily.naps }] : []),
      { label: t(locale, 'daily.stressLevel'), value: daily.stressLevel },
      { label: t(locale, 'daily.energyLevel'), value: daily.energyLevel },
      { label: t(locale, 'daily.dayDescription'), value: daily.dayDescription },
      ...(food
        ? [
            {
              label: t(locale, 'food.waterTitle'),
              value: food.waterLiters === null ? null : `${food.waterLiters} L`,
            },
            {
              label: t(locale, 'food.otherFluids'),
              value: booleanValue(locale, food.hasOtherFluids),
            },
            ...(food.hasOtherFluids
              ? [
                  {
                    label: t(locale, 'food.otherFluidsDetails'),
                    value: food.otherFluidsDisplay,
                  },
                ]
              : []),
          ]
        : []),
    ];
  }

  if (details.meal) {
    return [
      {
        label: t(locale, 'meal.type'),
        value: translatedValue(locale, 'meal.type', details.meal.type),
      },
      { label: t(locale, 'meal.name'), value: details.meal.name },
      { label: t(locale, 'meal.description'), value: details.meal.description },
    ];
  }

  if (details.fluid) {
    return [{ label: t(locale, 'fluid.name'), value: details.fluid.name }];
  }

  if (details.symptom) {
    const symptom = details.symptom;
    return [
      {
        label: t(locale, 'symptom.selectTitle'),
        value:
          symptom.type === 'other' && symptom.customType
            ? symptom.customType
            : translatedValue(locale, 'symptom.type', symptom.type),
      },
      { label: t(locale, 'doctor.customDescription'), value: symptom.customDescription },
      { label: t(locale, 'doctor.intakeList'), value: symptom.intakeList },
      {
        label: t(locale, 'symptom.startDateTime'),
        value: formatDateTime(locale, symptom.startedAt),
      },
      {
        label: t(locale, 'symptom.endDateTime'),
        value: formatDateTime(locale, symptom.endedAt),
      },
      {
        label: t(locale, 'symptom.intensity'),
        value: t(locale, `symptom.intensity${symptom.intensity}` as TranslationKey),
      },
      {
        label: t(locale, 'doctor.qualityOfLifeEffect'),
        value: symptom.qualityOfLifeEffect,
      },
      { label: t(locale, 'symptom.modifyingFactors'), value: symptom.modifyingFactors },
      {
        label: t(locale, 'symptom.sleepInterruption'),
        value: booleanValue(locale, symptom.wokeFromSleep),
      },
      ...(symptom.type === 'pain'
        ? [
            {
              label: t(locale, 'symptom.painLocation'),
              value:
                symptom.painLocation === 'other' && symptom.painLocationCustom
                  ? symptom.painLocationCustom
                  : translatedValue(locale, 'symptom.painLocation', symptom.painLocation),
            },
            {
              label: t(locale, 'symptom.painRadiates'),
              value: booleanValue(locale, symptom.painRadiates),
            },
            ...(symptom.painRadiates
              ? [{ label: t(locale, 'symptom.painRadiation'), value: symptom.painRadiation }]
              : []),
            {
              label: t(locale, 'symptom.painDescription'),
              value:
                symptom.painDescription === 'other' && symptom.painDescriptionCustom
                  ? symptom.painDescriptionCustom
                  : translatedValue(locale, 'symptom.painDescription', symptom.painDescription),
            },
          ]
        : []),
    ];
  }

  if (details.stool) {
    const stool = details.stool;
    return [
      {
        label: t(locale, 'stool.bristolType'),
        value: t(locale, 'stool.bristolSelected').replace('{type}', String(stool.bristolType)),
      },
      {
        label: t(locale, 'stool.urgency'),
        value: translatedValue(locale, 'stool.urgency', stool.urgencyLevel),
      },
      { label: t(locale, 'stool.pain'), value: booleanValue(locale, stool.pain) },
      { label: t(locale, 'stool.mucus'), value: booleanValue(locale, stool.mucus) },
      { label: t(locale, 'stool.blood'), value: booleanValue(locale, stool.blood) },
      { label: t(locale, 'stool.fattyStool'), value: booleanValue(locale, stool.fattyStool) },
      { label: t(locale, 'stool.blackStool'), value: booleanValue(locale, stool.blackStool) },
      { label: t(locale, 'stool.notes'), value: stool.notes },
    ];
  }

  if (details.medication) {
    return [
      { label: t(locale, 'medication.name'), value: details.medication.name },
      { label: t(locale, 'medication.dose'), value: details.medication.dose },
      {
        label: t(locale, 'medication.chronicTherapy'),
        value: booleanValue(locale, details.medication.isChronicTherapy),
      },
      { label: t(locale, 'medication.reason'), value: details.medication.reason },
    ];
  }

  if (details.exercise) {
    return [
      { label: t(locale, 'exercise.activity'), value: details.exercise.activity },
      {
        label: t(locale, 'exercise.duration'),
        value: `${details.exercise.durationMinutes} min`,
      },
      {
        label: t(locale, 'exercise.intensity'),
        value: translatedValue(locale, 'exercise.intensity', details.exercise.intensity),
      },
      { label: t(locale, 'exercise.notes'), value: details.exercise.notes },
    ];
  }

  if (details.menstruation) {
    return [
      {
        label: t(locale, 'menstruation.flow'),
        value: translatedValue(locale, 'menstruation.flow', details.menstruation.flow),
      },
      {
        label: t(locale, 'menstruation.pain'),
        value: translatedValue(locale, 'menstruation.pain', details.menstruation.painLevel),
      },
      { label: t(locale, 'menstruation.notes'), value: details.menstruation.notes },
    ];
  }

  return [];
}

export function DoctorBaselineDetails({
  baseline,
  locale,
}: {
  baseline: PatientBaselineProfile | null;
  locale: Locale;
}) {
  return (
    <section className="doctor-medical-panel" aria-labelledby="doctor-baseline-title">
      <h2 id="doctor-baseline-title">{t(locale, 'doctor.baselineTitle')}</h2>
      {baseline ? (
        <dl className="doctor-medical-grid">
          {baselineFields(locale, baseline).map((field) => (
            <div key={field.label}>
              <dt>{field.label}</dt>
              <dd>{visibleValue(locale, field.value)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="doctor-medical-empty">{t(locale, 'doctor.baselineEmpty')}</p>
      )}
    </section>
  );
}

export function DoctorEntryMedicalDetails({
  entry,
  locale,
}: {
  entry: DoctorTimelineEntry;
  locale: Locale;
}) {
  const fields = entryFields(locale, entry);
  if (!fields.length) return null;

  return (
    <section
      className="doctor-entry-medical-details"
      aria-label={t(locale, 'doctor.medicalDetails')}
    >
      <h3>{t(locale, 'doctor.medicalDetails')}</h3>
      <dl className="doctor-medical-grid">
        {fields.map((field) => (
          <div key={field.label}>
            <dt>{field.label}</dt>
            <dd>{visibleValue(locale, field.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
