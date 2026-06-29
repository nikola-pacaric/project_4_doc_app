import type { UserProfile } from '@project4/contracts';
import {
  dailyFormDefaults,
  hasDailyFormProgress,
  isCompleteDailyForm,
  type DailyFormDraft,
} from '@project4/forms';
import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';
import {
  getPatientBaseline,
  getPatientDailyForm,
  savePatientDailyForm,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { spacing } from '@project4/ui-tokens';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ConditionalTextField } from '../components/ConditionalTextField';
import { FormField } from '../components/FormField';
import { OptionButtons } from '../components/OptionButtons';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, sharedStyles } from '../theme';
import {
  formatDailyFormMissingFields,
  getDailyFormMissingFields,
  toDailyFormDraft,
} from '../utils/dailyFormCompletion';
import { formatTimeInput, localDayRange, toLocalDateInput } from '../utils/dateTime';

interface DailyFormScreenProps {
  client: AppSupabaseClient;
  onActivityAnswerChange: (answer: boolean | undefined) => void;
  onMedicationAnswerChange: (answer: boolean | undefined) => void;
  onMenstruationAnswerChange: (answer: boolean | undefined) => void;
  profile: UserProfile;
  onBack: () => void;
  onSaved: () => void;
}

export function DailyFormScreen({
  client,
  onActivityAnswerChange,
  onMedicationAnswerChange,
  onMenstruationAnswerChange,
  profile,
  onBack,
  onSaved,
}: DailyFormScreenProps) {
  const locale = DEFAULT_LOCALE;
  const today = toLocalDateInput(new Date());
  const day = today;
  const [draft, setDraft] = useState<DailyFormDraft>({ ...dailyFormDefaults });
  const [existingEntryId, setExistingEntryId] = useState<string>();
  const [completedAt, setCompletedAt] = useState<string>();
  const [includeMenstruation, setIncludeMenstruation] = useState(false);
  const [hasChronicTherapy, setHasChronicTherapy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const range = localDayRange(day);

    void Promise.all([
      getPatientBaseline(client, profile.id),
      getPatientDailyForm(client, profile.id, range.start, range.end),
    ])
      .then(([baseline, record]) => {
        if (!active) return;
        setIncludeMenstruation(baseline?.sex === 'female');
        const nextHasChronicTherapy = Boolean(baseline?.chronicTherapy?.trim());
        setHasChronicTherapy(nextHasChronicTherapy);
        setExistingEntryId(record?.entryId);
        setCompletedAt(record?.details.completedAt ?? undefined);
        const nextDraft = toDailyFormDraft(record?.details ?? null);
        if (!nextHasChronicTherapy) nextDraft.tookChronicTherapy = false;
        setDraft(nextDraft);
        onActivityAnswerChange(nextDraft.hadPhysicalActivity);
        onMedicationAnswerChange(nextDraft.tookMedicationOutsideChronicTherapy);
        onMenstruationAnswerChange(nextDraft.hadMenstruation);
      })
      .catch(() => active && setError(t(locale, 'daily.loadError')))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [
    client,
    day,
    locale,
    onActivityAnswerChange,
    onMedicationAnswerChange,
    onMenstruationAnswerChange,
    profile.id,
  ]);

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
    if (mode === 'progress' && !hasDailyFormProgress(draft)) {
      setError(t(locale, 'daily.progressEmpty'));
      return;
    }
    if (
      mode === 'complete' &&
      !isCompleteDailyForm(draft, includeMenstruation, hasChronicTherapy)
    ) {
      setError(t(locale, 'daily.requiredError'));
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const range = localDayRange(day);
      await savePatientDailyForm(
        client,
        profile.id,
        range.occurredAt,
        draft,
        includeMenstruation,
        mode === 'complete',
        existingEntryId,
      );
      const saved = await getPatientDailyForm(client, profile.id, range.start, range.end);
      setExistingEntryId(saved?.entryId);
      setCompletedAt(saved?.details.completedAt ?? undefined);
      setDraft(toDailyFormDraft(saved?.details ?? null));
      setMessage(t(locale, mode === 'complete' ? 'daily.completed' : 'daily.saved'));
      onSaved();
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

  const missingFields = getDailyFormMissingFields(draft, includeMenstruation, hasChronicTherapy);
  const draftStatusTitle = missingFields.length
    ? t(locale, 'daily.statusDraft')
    : t(locale, 'home.action.completed');
  const draftStatusHelp = missingFields.length
    ? formatDailyFormMissingFields(locale, missingFields)
    : t(locale, 'daily.readyForHomeSubmit');

  return (
    <SafeAreaView style={sharedStyles.formScreen}>
      <ScrollView
        contentContainerStyle={sharedStyles.formScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader eyebrow={t(locale, 'role.patient')} title={t(locale, 'daily.title')} />
        <Text style={sharedStyles.body}>{t(locale, 'daily.subtitle')}</Text>
        {loading ? <ActivityIndicator color={colors.accent} size="large" /> : null}
        {!loading ? (
          <View style={styles.form}>
            <View style={[styles.status, completedAt ? styles.completeStatus : styles.draftStatus]}>
              <Text style={styles.statusTitle}>
                {completedAt ? t(locale, 'daily.statusComplete') : draftStatusTitle}
              </Text>
              <Text style={styles.statusHelp}>
                {completedAt ? t(locale, 'daily.statusCompleteHelp') : draftStatusHelp}
              </Text>
            </View>
            <FormField
              keyboardType="number-pad"
              label={t(locale, 'daily.wakeTime')}
              maxLength={5}
              onChangeText={(value) =>
                setDraft((current) => ({
                  ...current,
                  wakeTime: formatTimeInput(value, current.wakeTime, 23),
                }))
              }
              placeholder="07:30"
              value={draft.wakeTime ?? ''}
            />
            <FormField
              keyboardType="number-pad"
              label={t(locale, 'daily.sleepDuration')}
              maxLength={5}
              onChangeText={(value) =>
                setDraft((current) => ({
                  ...current,
                  sleepDuration: formatTimeInput(value, current.sleepDuration),
                }))
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
            <OptionButtons
              label={t(locale, 'daily.activityNotes')}
              onChange={(value) => {
                const answer = value === 'yes';
                setDraft((current) => ({
                  ...current,
                  hadPhysicalActivity: answer,
                  activityNotes: '',
                }));
                onActivityAnswerChange(answer);
              }}
              options={[
                { value: 'yes', label: t(locale, 'common.yes') },
                { value: 'no', label: t(locale, 'common.no') },
              ]}
              value={
                draft.hadPhysicalActivity === undefined
                  ? undefined
                  : draft.hadPhysicalActivity
                    ? 'yes'
                    : 'no'
              }
            />
            {draft.hadPhysicalActivity ? (
              <Text selectable style={styles.exerciseRequirement}>
                {t(locale, 'daily.exerciseRequiredHelp')}
              </Text>
            ) : null}
            {scaleField('stressLevel', 'daily.stressLevel')}
            {scaleField('energyLevel', 'daily.energyLevel')}
            <OptionButtons
              disabled={!hasChronicTherapy}
              label={t(locale, 'daily.chronicTherapyTaken')}
              onChange={(value) =>
                setDraft((current) => ({ ...current, tookChronicTherapy: value === 'yes' }))
              }
              options={[
                { value: 'yes', label: t(locale, 'common.yes') },
                { value: 'no', label: t(locale, 'common.no') },
              ]}
              value={
                draft.tookChronicTherapy === undefined
                  ? undefined
                  : draft.tookChronicTherapy
                    ? 'yes'
                    : 'no'
              }
            />
            {!hasChronicTherapy ? (
              <Text selectable style={styles.dependencyHelp}>
                {t(locale, 'daily.noChronicTherapyHelp')}
              </Text>
            ) : null}
            <OptionButtons
              label={t(locale, 'daily.medication')}
              onChange={(value) => {
                const answer = value === 'yes';
                setDraft((current) => ({
                  ...current,
                  tookMedicationOutsideChronicTherapy: answer,
                  medicationOutsideChronicTherapy: '',
                }));
                onMedicationAnswerChange(answer);
              }}
              options={[
                { value: 'yes', label: t(locale, 'common.yes') },
                { value: 'no', label: t(locale, 'common.no') },
              ]}
              value={
                draft.tookMedicationOutsideChronicTherapy === undefined
                  ? undefined
                  : draft.tookMedicationOutsideChronicTherapy
                    ? 'yes'
                    : 'no'
              }
            />
            {draft.tookMedicationOutsideChronicTherapy ? (
              <Text selectable style={styles.medicationRequirement}>
                {t(locale, 'daily.medicationRequiredHelp')}
              </Text>
            ) : null}
            {includeMenstruation ? (
              <OptionButtons
                label={t(locale, 'daily.menstruation')}
                onChange={(value) => {
                  const answer = value === 'yes';
                  setDraft((current) => ({
                    ...current,
                    hadMenstruation: answer,
                    menstruationNotes: '',
                  }));
                  onMenstruationAnswerChange(answer);
                }}
                options={[
                  { value: 'yes', label: t(locale, 'common.yes') },
                  { value: 'no', label: t(locale, 'common.no') },
                ]}
                value={
                  draft.hadMenstruation === undefined
                    ? undefined
                    : draft.hadMenstruation
                      ? 'yes'
                      : 'no'
                }
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
            {error ? <Text style={sharedStyles.error}>{error}</Text> : null}
            {message ? <Text style={sharedStyles.success}>{message}</Text> : null}
            <View style={styles.actions}>
              <View style={styles.action}>
                <PrimaryButton
                  label={t(locale, 'common.cancel')}
                  onPress={onBack}
                  variant="secondary"
                />
              </View>
              <View style={styles.action}>
                <PrimaryButton
                  busy={saving}
                  label={t(locale, 'common.save')}
                  onPress={() => void save('progress')}
                />
              </View>
            </View>
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
  exerciseRequirement: {
    backgroundColor: '#fff4e5',
    borderColor: '#e7bd76',
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    padding: spacing.md,
  },
  medicationRequirement: {
    backgroundColor: '#fff4e5',
    borderColor: '#e7bd76',
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    padding: spacing.md,
  },
  dependencyHelp: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
    marginTop: -spacing.sm,
  },
  actions: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 'auto',
    paddingTop: spacing.md,
  },
  action: { flex: 1 },
});
