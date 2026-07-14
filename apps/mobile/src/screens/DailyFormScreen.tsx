import type { UserProfile } from '@project4/contracts';
import {
  dailyFormDefaults,
  hasDailyFormProgress,
  isCompleteDailyForm,
  toDailyFormDraft,
  type DailyFormDraft,
} from '@project4/forms';
import { getActiveLocale, t, type TranslationKey } from '@project4/i18n';
import {
  getPatientBaseline,
  getPatientDailyForm,
  savePatientDailyForm,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { LayoutAnimation, Platform, Text, UIManager, View } from 'react-native';
import { useEffect, useState } from 'react';

import { FormField } from '../components/FormField';
import { TactileChoiceRow } from '../components/TactileChoiceRow';
import { TactileFormShell, useTactileFormPalette } from '../components/TactileFormShell';
import { TactileSectionCard } from '../components/TactileSectionCard';
import { TimePickerField } from '../components/TimePickerField';
import {
  tactileFieldLabelStyle,
  tactileFormLayout as layout,
  tactileMultilineInputStyle,
  tactilePillInputStyle,
} from '../theme/tactileForm';
import { localDayRange, toLocalDateInput } from '../utils/dateTime';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface DailyFormScreenProps {
  client: AppSupabaseClient;
  onActivityAnswerChange: (answer: boolean | undefined) => void;
  onMedicationAnswerChange: (answer: boolean | undefined) => void;
  onMenstruationAnswerChange: (answer: boolean | undefined) => void;
  profile: UserProfile;
  onBack: () => void;
  onCancelProfile?: () => void;
  onCancelTimeline?: () => void;
  onSaved: () => void;
}

export function DailyFormScreen({
  client,
  onActivityAnswerChange,
  onMedicationAnswerChange,
  onMenstruationAnswerChange,
  profile,
  onBack,
  onCancelProfile,
  onCancelTimeline,
  onSaved,
}: DailyFormScreenProps) {
  const locale = getActiveLocale();
  const palette = useTactileFormPalette();
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
  const pill = tactilePillInputStyle(palette);
  const multi = tactileMultilineInputStyle(palette);
  const label = tactileFieldLabelStyle(palette);

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
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
      <TactileChoiceRow
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
        palette={palette}
        value={draft[field] ? String(draft[field]) : undefined}
      />
    );
  }

  const showDraftStatus = Boolean(existingEntryId && !completedAt && hasDailyFormProgress(draft));

  return (
    <TactileFormShell
      error={error}
      loading={loading}
      message={message}
      onCancelProfile={onCancelProfile}
      onCancelTimeline={onCancelTimeline}
      onCancelToday={onBack}
      onSave={() => void save('progress')}
      saveBusy={saving}
      subtitle={t(locale, 'daily.subtitle')}
      title={t(locale, 'daily.title')}
    >
      {completedAt || showDraftStatus ? (
        <View
          style={[
            layout.statusBanner,
            {
              backgroundColor: completedAt
                ? palette.secondaryContainer
                : palette.surfaceContainerLow,
            },
          ]}
        >
          <Text
            style={{
              color: palette.onSurface,
              fontSize: 16,
              fontWeight: '800',
              textAlign: showDraftStatus && !completedAt ? 'center' : 'left',
            }}
          >
            {completedAt ? t(locale, 'daily.statusComplete') : t(locale, 'daily.statusDraft')}
          </Text>
          {completedAt ? (
            <Text style={[layout.helpText, { color: palette.onSurfaceVariant }]}>
              {t(locale, 'daily.statusCompleteHelp')}
            </Text>
          ) : null}
        </View>
      ) : null}

      <TactileSectionCard icon="☀️" palette={palette} title={t(locale, 'daily.title')}>
        <TimePickerField
          label={t(locale, 'daily.wakeTime')}
          labelStyle={label}
          onChange={(value) => setDraft((current) => ({ ...current, wakeTime: value }))}
          placeholder="07:30"
          style={pill}
          value={draft.wakeTime ?? ''}
          valueStyle={{ color: palette.onSurface }}
        />
        <TimePickerField
          label={t(locale, 'daily.sleepDuration')}
          labelStyle={label}
          onChange={(value) => setDraft((current) => ({ ...current, sleepDuration: value }))}
          placeholder="08:00"
          style={pill}
          value={draft.sleepDuration ?? ''}
          valueStyle={{ color: palette.onSurface }}
        />
        <TactileChoiceRow
          label={t(locale, 'daily.appetite')}
          mode="segmented"
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
          palette={palette}
          value={draft.appetite}
        />
        <TactileChoiceRow
          label={t(locale, 'daily.activityNotes')}
          mode="segmented"
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
          palette={palette}
          value={
            draft.hadPhysicalActivity === undefined
              ? undefined
              : draft.hadPhysicalActivity
                ? 'yes'
                : 'no'
          }
        />
        {draft.hadPhysicalActivity ? (
          <Text
            style={[
              layout.statusBanner,
              layout.helpText,
              {
                backgroundColor: palette.surfaceContainerLow,
                color: palette.onSurface,
                borderLeftColor: palette.primary,
                borderLeftWidth: 3,
              },
            ]}
          >
            {t(locale, 'daily.exerciseRequiredHelp')}
          </Text>
        ) : null}
        {scaleField('stressLevel', 'daily.stressLevel')}
        {scaleField('energyLevel', 'daily.energyLevel')}
        <TactileChoiceRow
          disabled={!hasChronicTherapy}
          label={t(locale, 'daily.chronicTherapyTaken')}
          mode="segmented"
          onChange={(value) =>
            setDraft((current) => ({ ...current, tookChronicTherapy: value === 'yes' }))
          }
          options={[
            { value: 'yes', label: t(locale, 'common.yes') },
            { value: 'no', label: t(locale, 'common.no') },
          ]}
          palette={palette}
          value={
            !hasChronicTherapy
              ? 'no'
              : draft.tookChronicTherapy === undefined
                ? undefined
                : draft.tookChronicTherapy
                  ? 'yes'
                  : 'no'
          }
        />
        {!hasChronicTherapy ? (
          <Text style={[layout.helpText, { color: palette.onSurfaceVariant }]}>
            {t(locale, 'daily.noChronicTherapyHelp')}
          </Text>
        ) : null}
        <TactileChoiceRow
          label={t(locale, 'daily.medication')}
          mode="segmented"
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
          palette={palette}
          value={
            draft.tookMedicationOutsideChronicTherapy === undefined
              ? undefined
              : draft.tookMedicationOutsideChronicTherapy
                ? 'yes'
                : 'no'
          }
        />
        {draft.tookMedicationOutsideChronicTherapy ? (
          <Text
            style={[
              layout.statusBanner,
              layout.helpText,
              {
                backgroundColor: palette.surfaceContainerLow,
                color: palette.onSurface,
                borderLeftColor: palette.primary,
                borderLeftWidth: 3,
              },
            ]}
          >
            {t(locale, 'daily.medicationRequiredHelp')}
          </Text>
        ) : null}
        {includeMenstruation ? (
          <TactileChoiceRow
            label={t(locale, 'daily.menstruation')}
            mode="segmented"
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
            palette={palette}
            value={
              draft.hadMenstruation === undefined
                ? undefined
                : draft.hadMenstruation
                  ? 'yes'
                  : 'no'
            }
          />
        ) : null}
        <TactileChoiceRow
          label={t(locale, 'daily.naps')}
          mode="segmented"
          onChange={(value) => updateConditional('hadNaps', 'naps', value === 'yes')}
          options={[
            { value: 'yes', label: t(locale, 'common.yes') },
            { value: 'no', label: t(locale, 'common.no') },
          ]}
          palette={palette}
          value={draft.hadNaps === undefined ? undefined : draft.hadNaps ? 'yes' : 'no'}
        />
        {draft.hadNaps ? (
          <FormField
            enableVoice
            label={t(locale, 'daily.napsDetails')}
            labelStyle={label}
            multiline
            onChangeText={(naps) => setDraft((current) => ({ ...current, naps }))}
            style={multi}
            value={draft.naps ?? ''}
          />
        ) : null}
        <FormField
          enableVoice
          label={t(locale, 'daily.dayDescription')}
          labelStyle={label}
          multiline
          onChangeText={(dayDescription) =>
            setDraft((current) => ({ ...current, dayDescription }))
          }
          style={multi}
          value={draft.dayDescription ?? ''}
        />
      </TactileSectionCard>
    </TactileFormShell>
  );
}
