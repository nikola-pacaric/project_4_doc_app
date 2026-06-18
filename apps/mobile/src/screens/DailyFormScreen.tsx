import type { DailyFormDetails, UserProfile } from '@project4/contracts';
import {
  dailyFormDefaults,
  getStartedMeals,
  hasDailyFormProgress,
  isCompleteDailyForm,
  validateMealProgress,
  validateMeals,
  type DailyFormDraft,
  type MealDraft,
} from '@project4/forms';
import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';
import {
  getPatientBaseline,
  getPatientDailyForm,
  listPatientMeals,
  savePatientDailyForm,
  savePatientMeals,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { spacing } from '@project4/ui-tokens';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ConditionalTextField } from '../components/ConditionalTextField';
import { FormField } from '../components/FormField';
import { MealFields } from '../components/MealFields';
import { OptionButtons } from '../components/OptionButtons';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, sharedStyles } from '../theme';
import { toLocalDateInput } from '../utils/dateTime';

interface DailyFormScreenProps {
  client: AppSupabaseClient;
  profile: UserProfile;
  onBack: () => void;
}

function dayRange(day: string): { start: string; end: string; occurredAt: string } {
  const [yearText = '', monthText = '', dateText = ''] = day.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const date = Number(dateText);
  return {
    start: new Date(year, month - 1, date).toISOString(),
    end: new Date(year, month - 1, date + 1).toISOString(),
    occurredAt: new Date(year, month - 1, date, 12).toISOString(),
  };
}

function isValidTrackedDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day > toLocalDateInput(new Date())) return false;
  const [yearText = '', monthText = '', dateText = ''] = day.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const date = Number(dateText);
  const parsed = new Date(year, month - 1, date);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === date;
}

function toDraft(details: DailyFormDetails | null): DailyFormDraft {
  if (!details) return { ...dailyFormDefaults };
  return {
    wakeTime: details.wakeTime ?? undefined,
    sleepDuration: details.sleepDuration ?? undefined,
    appetite: details.appetite ?? undefined,
    waterMl: details.waterMl ?? undefined,
    hasOtherFluids: details.hasOtherFluids ?? Boolean(details.otherFluids?.trim()),
    otherFluids: details.otherFluids ?? '',
    hadPhysicalActivity: details.hadPhysicalActivity ?? Boolean(details.activityNotes?.trim()),
    activityNotes: details.activityNotes ?? '',
    stressLevel: details.stressLevel ?? undefined,
    dayDescription: details.dayDescription ?? '',
    tookMedicationOutsideChronicTherapy:
      details.tookMedicationOutsideChronicTherapy ??
      Boolean(details.medicationOutsideChronicTherapy?.trim()),
    medicationOutsideChronicTherapy: details.medicationOutsideChronicTherapy ?? '',
    hadMenstruation: details.hadMenstruation ?? Boolean(details.menstruationNotes?.trim()),
    menstruationNotes: details.menstruationNotes ?? '',
    energyLevel: details.energyLevel ?? undefined,
    hadNaps: details.hadNaps ?? Boolean(details.naps?.trim()),
    naps: details.naps ?? '',
    hasAdditionalNotes: details.hasAdditionalNotes ?? Boolean(details.notes?.trim()),
    notes: details.notes ?? '',
  };
}

export function DailyFormScreen({ client, profile, onBack }: DailyFormScreenProps) {
  const locale = DEFAULT_LOCALE;
  const today = toLocalDateInput(new Date());
  const [dayInput, setDayInput] = useState(today);
  const [day, setDay] = useState(today);
  const [draft, setDraft] = useState<DailyFormDraft>({ ...dailyFormDefaults });
  const [existingEntryId, setExistingEntryId] = useState<string>();
  const [completedAt, setCompletedAt] = useState<string>();
  const [meals, setMeals] = useState<MealDraft[]>([{ description: '' }]);
  const [previousMealEntryIds, setPreviousMealEntryIds] = useState<string[]>([]);
  const [includeMenstruation, setIncludeMenstruation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const range = dayRange(day);

    void Promise.all([
      getPatientBaseline(client, profile.id),
      getPatientDailyForm(client, profile.id, range.start, range.end),
      listPatientMeals(client, profile.id, range.start, range.end),
    ])
      .then(([baseline, record, loadedMeals]) => {
        if (!active) return;
        setIncludeMenstruation(baseline?.sex === 'female');
        setExistingEntryId(record?.entryId);
        setCompletedAt(record?.details.completedAt ?? undefined);
        setDraft(toDraft(record?.details ?? null));
        setPreviousMealEntryIds(loadedMeals.map((meal) => meal.entryId));
        setMeals(
          loadedMeals.length
            ? loadedMeals.map((meal) => ({
                entryId: meal.entryId,
                type: meal.type ?? undefined,
                name: meal.name ?? '',
                description: meal.description ?? '',
              }))
            : [{ description: '' }],
        );
      })
      .catch(() => active && setError(t(locale, 'daily.loadError')))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [client, day, locale, profile.id]);

  function updateTrackedDay(value: string) {
    setDayInput(value);
    if (isValidTrackedDay(value) && value !== day) {
      setLoading(true);
      setError(null);
      setMessage(null);
      setDay(value);
    }
  }

  function updateConditional(
    answerField: keyof DailyFormDraft,
    detailField: keyof DailyFormDraft,
    answer: boolean,
  ) {
    setDraft((current) => ({
      ...current,
      [answerField]: answer,
      [detailField]: answer ? current[detailField] : '',
    }));
  }

  async function save(mode: 'progress' | 'complete') {
    if (!isValidTrackedDay(dayInput)) {
      setError(t(locale, 'daily.dayInvalid'));
      return;
    }
    const startedMeals = getStartedMeals(meals);
    if (!validateMealProgress(meals)) {
      setError(t(locale, 'daily.mealProgressError'));
      return;
    }
    if (mode === 'progress' && !hasDailyFormProgress(draft) && startedMeals.length === 0) {
      setError(t(locale, 'daily.progressEmpty'));
      return;
    }
    if (
      mode === 'complete' &&
      (!isCompleteDailyForm(draft, includeMenstruation) || !validateMeals(startedMeals))
    ) {
      setError(t(locale, 'daily.requiredError'));
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const range = dayRange(day);
      await savePatientDailyForm(
        client,
        profile.id,
        range.occurredAt,
        draft,
        includeMenstruation,
        mode === 'complete',
        existingEntryId,
      );
      await savePatientMeals(client, profile.id, range.occurredAt, startedMeals, previousMealEntryIds);
      const [saved, savedMeals] = await Promise.all([
        getPatientDailyForm(client, profile.id, range.start, range.end),
        listPatientMeals(client, profile.id, range.start, range.end),
      ]);
      setExistingEntryId(saved?.entryId);
      setCompletedAt(saved?.details.completedAt ?? undefined);
      setDraft(toDraft(saved?.details ?? null));
      setPreviousMealEntryIds(savedMeals.map((meal) => meal.entryId));
      setMeals(
        savedMeals.length
          ? savedMeals.map((meal) => ({
              entryId: meal.entryId,
              type: meal.type ?? undefined,
              name: meal.name ?? '',
              description: meal.description ?? '',
            }))
          : [{ description: '' }],
      );
      setMessage(t(locale, mode === 'complete' ? 'daily.completed' : 'daily.progressSaved'));
    } catch {
      setError(t(locale, 'daily.saveError'));
    } finally {
      setSaving(false);
    }
  }

  function scaleField(field: 'stressLevel' | 'energyLevel', key: TranslationKey) {
    return (
      <OptionButtons
        label={t(locale, key)}
        onChange={(value) =>
          setDraft((current) => ({ ...current, [field]: Number(value) as 1 | 2 | 3 }))
        }
        options={([1, 2, 3] as const).map((level) => ({
          value: String(level),
          label: String(level),
          detail: t(
            locale,
            level === 1
              ? 'daily.levelLow'
              : level === 2
                ? 'daily.levelModerate'
                : 'daily.levelHigh',
          ),
        }))}
        value={draft[field] ? String(draft[field]) : undefined}
      />
    );
  }

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScrollView contentContainerStyle={sharedStyles.scrollContent} keyboardShouldPersistTaps="handled">
        <ScreenHeader eyebrow={t(locale, 'role.patient')} title={t(locale, 'daily.title')} />
        <Text style={sharedStyles.body}>{t(locale, 'daily.subtitle')}</Text>
        <PrimaryButton label={t(locale, 'common.cancel')} onPress={onBack} variant="secondary" />
        <FormField
          autoCapitalize="none"
          label={t(locale, 'daily.trackedDay')}
          maxLength={10}
          onChangeText={updateTrackedDay}
          placeholder="YYYY-MM-DD"
          value={dayInput}
        />
        {loading ? <ActivityIndicator color={colors.accent} size="large" /> : null}
        {!loading ? (
          <View style={styles.form}>
            <View style={[styles.status, completedAt ? styles.completeStatus : styles.draftStatus]}>
              <Text style={styles.statusTitle}>
                {t(locale, completedAt ? 'daily.statusComplete' : 'daily.statusDraft')}
              </Text>
              <Text style={styles.statusHelp}>
                {t(locale, completedAt ? 'daily.statusCompleteHelp' : 'daily.statusDraftHelp')}
              </Text>
            </View>
            <FormField
              label={t(locale, 'daily.wakeTime')}
              maxLength={5}
              onChangeText={(wakeTime) => setDraft((current) => ({ ...current, wakeTime }))}
              placeholder="07:30"
              value={draft.wakeTime ?? ''}
            />
            <FormField
              label={t(locale, 'daily.sleepDuration')}
              maxLength={5}
              onChangeText={(sleepDuration) =>
                setDraft((current) => ({ ...current, sleepDuration }))
              }
              placeholder="08:00"
              value={draft.sleepDuration ?? ''}
            />
            <OptionButtons
              label={t(locale, 'daily.appetite')}
              onChange={(appetite) =>
                setDraft((current) => ({
                  ...current,
                  appetite: appetite as DailyFormDraft['appetite'],
                }))
              }
              options={(['low', 'usual', 'high'] as const).map((appetite) => ({
                value: appetite,
                label: t(locale, `daily.appetite.${appetite}`),
              }))}
              value={draft.appetite}
            />
            <FormField
              keyboardType="number-pad"
              label={t(locale, 'daily.waterMl')}
              onChangeText={(value) =>
                setDraft((current) => ({
                  ...current,
                  waterMl: value.trim() ? Number(value) : undefined,
                }))
              }
              value={draft.waterMl?.toString() ?? ''}
            />
            <MealFields meals={meals} onChange={setMeals} />
            <ConditionalTextField
              answer={draft.hasOtherFluids}
              detailKey="daily.otherFluidsDetails"
              onAnswerChange={(answer) => updateConditional('hasOtherFluids', 'otherFluids', answer)}
              onTextChange={(otherFluids) => setDraft((current) => ({ ...current, otherFluids }))}
              questionKey="daily.otherFluids"
              text={draft.otherFluids ?? ''}
            />
            <ConditionalTextField
              answer={draft.hadPhysicalActivity}
              detailKey="daily.activityDetails"
              onAnswerChange={(answer) =>
                updateConditional('hadPhysicalActivity', 'activityNotes', answer)
              }
              onTextChange={(activityNotes) =>
                setDraft((current) => ({ ...current, activityNotes }))
              }
              questionKey="daily.activityNotes"
              text={draft.activityNotes ?? ''}
            />
            {scaleField('stressLevel', 'daily.stressLevel')}
            {scaleField('energyLevel', 'daily.energyLevel')}
            <ConditionalTextField
              answer={draft.tookMedicationOutsideChronicTherapy}
              detailKey="daily.medicationDetails"
              onAnswerChange={(answer) =>
                updateConditional(
                  'tookMedicationOutsideChronicTherapy',
                  'medicationOutsideChronicTherapy',
                  answer,
                )
              }
              onTextChange={(medicationOutsideChronicTherapy) =>
                setDraft((current) => ({ ...current, medicationOutsideChronicTherapy }))
              }
              questionKey="daily.medication"
              text={draft.medicationOutsideChronicTherapy ?? ''}
            />
            {includeMenstruation ? (
              <ConditionalTextField
                answer={draft.hadMenstruation}
                detailKey="daily.menstruationDetails"
                onAnswerChange={(answer) =>
                  updateConditional('hadMenstruation', 'menstruationNotes', answer)
                }
                onTextChange={(menstruationNotes) =>
                  setDraft((current) => ({ ...current, menstruationNotes }))
                }
                questionKey="daily.menstruation"
                text={draft.menstruationNotes ?? ''}
              />
            ) : null}
            <ConditionalTextField
              answer={draft.hadNaps}
              detailKey="daily.napsDetails"
              onAnswerChange={(answer) => updateConditional('hadNaps', 'naps', answer)}
              onTextChange={(naps) => setDraft((current) => ({ ...current, naps }))}
              questionKey="daily.naps"
              text={draft.naps ?? ''}
            />
            <FormField
              label={t(locale, 'daily.dayDescription')}
              multiline
              onChangeText={(dayDescription) =>
                setDraft((current) => ({ ...current, dayDescription }))
              }
              value={draft.dayDescription ?? ''}
            />
            <ConditionalTextField
              answer={draft.hasAdditionalNotes}
              detailKey="daily.notesDetails"
              onAnswerChange={(answer) =>
                updateConditional('hasAdditionalNotes', 'notes', answer)
              }
              onTextChange={(notes) => setDraft((current) => ({ ...current, notes }))}
              questionKey="daily.notes"
              text={draft.notes ?? ''}
            />
            {error ? <Text style={sharedStyles.error}>{error}</Text> : null}
            {message ? <Text style={sharedStyles.success}>{message}</Text> : null}
            {completedAt ? (
              <PrimaryButton
                busy={saving}
                label={t(locale, 'daily.saveChanges')}
                onPress={() => void save('complete')}
              />
            ) : (
              <View style={styles.actions}>
                <View style={styles.action}>
                  <PrimaryButton
                    busy={saving}
                    label={t(locale, 'daily.saveProgress')}
                    onPress={() => void save('progress')}
                    variant="secondary"
                  />
                </View>
                <View style={styles.action}>
                  <PrimaryButton
                    busy={saving}
                    label={t(locale, 'daily.completeDay')}
                    onPress={() => void save('complete')}
                  />
                </View>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  status: { borderRadius: 16, borderWidth: 1, gap: spacing.xs, padding: spacing.md },
  draftStatus: { backgroundColor: '#fff8e8', borderColor: '#ead8a8' },
  completeStatus: { backgroundColor: '#edf8f2', borderColor: '#b9dfc9' },
  statusTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  statusHelp: { color: colors.mutedText, fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
