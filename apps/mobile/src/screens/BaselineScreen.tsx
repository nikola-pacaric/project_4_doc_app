import type { PatientBaselineProfile, PatientSex, UserProfile } from '@project4/contracts';
import {
  baselineProfileDefaults,
  isCompleteBaselineProfile,
  parseRecentMajorWeightChange,
  type BaselineProfileDraft,
} from '@project4/forms';
import { getActiveLocale, t, type TranslationKey } from '@project4/i18n';
import {
  getPatientBaseline,
  savePatientBaseline,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { darkTheme } from '@project4/ui-tokens';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';

import { FormField } from '../components/FormField';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { PatientBottomNav } from '../components/PatientBottomNav';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusMessage } from '../components/StatusMessage';
import { useDiscardGuard } from '../hooks/useDiscardGuard';
import { colors } from '../theme';

/**
 * Stitch "Baseline Profile - Tactile Redesign" / Tactile Bloom tokens.
 * Mobile-only surface — web baseline is intentionally unchanged.
 */
const stitch = {
  background: '#fdf8fd',
  surface: '#ffffff',
  surfaceContainer: '#f1ecf2',
  surfaceContainerLow: '#f7f2f8',
  secondaryContainer: '#fcdae1',
  primary: '#a63553',
  primaryContainer: '#f4718f',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#6b022a',
  onSurface: '#1c1b1f',
  onSurfaceVariant: '#564145',
  outline: '#897174',
  outlineVariant: '#dcbfc3',
  error: '#ba1a1a',
  shadow: 'rgba(166, 53, 83, 0.08)',
} as const;

interface BaselineScreenProps {
  client: AppSupabaseClient;
  profile: UserProfile;
  onBack: () => void;
  onOpenSettings?: () => void;
  onOpenTimeline?: () => void;
}

const sexOptions: Array<{ value: PatientSex; key: TranslationKey; icon: string }> = [
  { value: 'female', key: 'baseline.sexFemale', icon: '♀' },
  { value: 'male', key: 'baseline.sexMale', icon: '♂' },
  { value: 'other', key: 'baseline.sexOther', icon: '⚧' },
  { value: 'prefer_not_to_say', key: 'baseline.sexPreferNot', icon: '◌' },
];

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

function toDraft(current: PatientBaselineProfile | null): BaselineProfileDraft {
  if (!current) return { ...baselineProfileDefaults };
  return {
    sex: current.sex ?? undefined,
    birthYear: current.birthYear ?? undefined,
    occupation: current.occupation ?? '',
    chronicDiseases: current.chronicDiseases ?? '',
    chronicTherapy: current.chronicTherapy ?? '',
    menstrualHistory: current.menstrualHistory ?? '',
    weightKg: current.weightKg ?? undefined,
    heightCm: current.heightCm ?? undefined,
    ...parseRecentMajorWeightChange(current.recentMajorWeightChange),
  };
}

function optionalNumber(value: string): number | undefined {
  return value.trim() === '' ? undefined : Number(value.replace(',', '.'));
}

interface ChronicTherapyInput {
  name: string;
  dose: string;
}

function parseDiseaseNames(value: string | null | undefined): string[] {
  const names = value
    ?.split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);
  return names?.length ? names : [''];
}

function parseChronicTherapies(value: string | null | undefined): ChronicTherapyInput[] {
  const therapies = value
    ?.split(/\r?\n/)
    .map((line) => {
      const [name = '', ...doseParts] = line.split(/\s+[—-]\s+/);
      return { name: name.trim(), dose: doseParts.join(' - ').trim() };
    })
    .filter(({ name, dose }) => name || dose);
  return therapies?.length ? therapies : [{ name: '', dose: '' }];
}

function serializeDiseaseNames(names: string[]): string {
  return names
    .map((name) => name.trim())
    .filter(Boolean)
    .join('\n');
}

function serializeChronicTherapies(therapies: ChronicTherapyInput[]): string {
  return therapies
    .map(({ name, dose }) => {
      const trimmedName = name.trim();
      const trimmedDose = dose.trim();
      if (!trimmedName && !trimmedDose) return '';
      return trimmedDose ? `${trimmedName} — ${trimmedDose}` : trimmedName;
    })
    .filter(Boolean)
    .join('\n');
}

function savedYesNoFromText(
  profile: PatientBaselineProfile | null,
  value: string | null | undefined,
): boolean | undefined {
  if (!profile) return undefined;
  return Boolean(value?.trim());
}

function isDarkThemeActive(): boolean {
  return colors.background === darkTheme.colors.background;
}

type Palette = {
  background: string;
  surface: string;
  surfaceContainer: string;
  surfaceContainerLow: string;
  secondaryContainer: string;
  primary: string;
  primaryContainer: string;
  onPrimary: string;
  onPrimaryContainer: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  error: string;
  shadow: string;
};

function YesNoToggle({
  value,
  onChange,
  palette,
  yesLabel,
  noLabel,
}: {
  value: boolean | undefined;
  onChange: (next: boolean) => void;
  palette: Palette;
  yesLabel: string;
  noLabel: string;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.yesNoTrack, { backgroundColor: palette.surfaceContainer }]}
    >
      {([true, false] as const).map((answer) => {
        const selected = value === answer;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            key={String(answer)}
            onPress={() => onChange(answer)}
            style={({ pressed }) => [
              styles.yesNoItem,
              selected && {
                backgroundColor: palette.primaryContainer,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.yesNoLabel,
                {
                  color: selected ? palette.onPrimaryContainer : palette.onSurfaceVariant,
                  fontWeight: selected ? '700' : '600',
                },
              ]}
            >
              {answer ? yesLabel : noLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function BaselineScreen({
  client,
  profile,
  onBack,
  onOpenSettings,
  onOpenTimeline,
}: BaselineScreenProps) {
  const locale = getActiveLocale();
  const dark = isDarkThemeActive();
  const palette: Palette = dark
    ? {
        background: colors.background,
        surface: colors.surface,
        surfaceContainer: colors.surfaceAlt,
        surfaceContainerLow: colors.surfaceAlt,
        secondaryContainer: colors.surfaceAlt,
        primary: colors.accentStrong,
        primaryContainer: colors.accent,
        onPrimary: colors.onAccent,
        onPrimaryContainer: colors.onAccent,
        onSurface: colors.text,
        onSurfaceVariant: colors.mutedText,
        outline: colors.mutedText,
        outlineVariant: colors.border,
        error: colors.danger,
        shadow: '#000000',
      }
    : stitch;

  const [current, setCurrent] = useState<PatientBaselineProfile | null>(null);
  const [draft, setDraft] = useState<BaselineProfileDraft>({ ...baselineProfileDefaults });
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [hasChronicDiseases, setHasChronicDiseases] = useState<boolean>();
  const [hasChronicTherapy, setHasChronicTherapy] = useState<boolean>();
  const [chronicDiseaseNames, setChronicDiseaseNames] = useState<string[]>(['']);
  const [chronicTherapies, setChronicTherapies] = useState<ChronicTherapyInput[]>([
    { name: '', dose: '' },
  ]);

  const hasUnsavedChanges =
    !loading &&
    JSON.stringify({
      draft,
      hasChronicDiseases,
      hasChronicTherapy,
      chronicDiseaseNames,
      chronicTherapies,
    }) !==
      JSON.stringify({
        draft: toDraft(current),
        hasChronicDiseases: savedYesNoFromText(current, current?.chronicDiseases),
        hasChronicTherapy: savedYesNoFromText(current, current?.chronicTherapy),
        chronicDiseaseNames: parseDiseaseNames(current?.chronicDiseases),
        chronicTherapies: parseChronicTherapies(current?.chronicTherapy),
      });
  const confirmDiscard = useDiscardGuard({
    busy: saving,
    enabled: hasUnsavedChanges,
    onHardwareBack: onBack,
  });

  const pillInputStyle = {
    backgroundColor: palette.surfaceContainerLow,
    borderColor: 'transparent',
    borderRadius: 999,
    borderWidth: 0,
    color: palette.onSurface,
  };
  const fieldLabelStyle = {
    color: palette.primary,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
  };
  const softFieldLabelStyle = {
    color: palette.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 8,
  };

  function selectWeightChange(answer: 'yes' | 'no') {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDraft((value) => ({
      ...value,
      recentMajorWeightChange: answer,
      recentMajorWeightChangeDescription:
        answer === 'no' ? '' : value.recentMajorWeightChangeDescription,
    }));
  }

  useEffect(() => {
    let active = true;
    void getPatientBaseline(client, profile.id)
      .then((loaded) => {
        if (!active) return;
        setCurrent(loaded);
        setDraft(toDraft(loaded));
        setHasChronicDiseases(savedYesNoFromText(loaded, loaded?.chronicDiseases));
        setHasChronicTherapy(savedYesNoFromText(loaded, loaded?.chronicTherapy));
        setChronicDiseaseNames(parseDiseaseNames(loaded?.chronicDiseases));
        setChronicTherapies(parseChronicTherapies(loaded?.chronicTherapy));
      })
      .catch(() => {
        if (active) {
          setLoadFailed(true);
          setError(t(locale, 'baseline.loadError'));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client, locale, profile.id, reloadToken]);

  function retryLoad() {
    setError(null);
    setLoadFailed(false);
    setLoading(true);
    setReloadToken((value) => value + 1);
  }

  if (!loading && loadFailed) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
        <View style={styles.loadFailure}>
          <StatusMessage
            message={error ?? t(locale, 'baseline.loadError')}
            style={[styles.statusError, { color: palette.error }]}
            tone="error"
          />
          <PrimaryButton label={t(locale, 'common.retry')} onPress={retryLoad} />
          <PrimaryButton label={t(locale, 'common.back')} onPress={onBack} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }
  async function save() {
    if (
      !isCompleteBaselineProfile(draft) ||
      hasChronicDiseases === undefined ||
      hasChronicTherapy === undefined ||
      (hasChronicDiseases && chronicDiseaseNames.some((name) => !name.trim())) ||
      (hasChronicTherapy && chronicTherapies.some(({ name, dose }) => !name.trim() || !dose.trim()))
    ) {
      setError(t(locale, 'baseline.requiredError'));
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await savePatientBaseline(client, profile.id, draft, current);
      setCurrent(saved);
      setDraft(toDraft(saved));
      setMessage(t(locale, 'baseline.saved'));
      onBack();
    } catch {
      setError(t(locale, 'baseline.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: palette.background }}
      >
        {/* Header */}
        <View style={styles.headerBlock}>
          <Text style={[styles.pageTitle, { color: palette.onSurface }]}>
            {t(locale, 'baseline.title')}
          </Text>
          <Text style={[styles.pageSubtitle, { color: palette.onSurfaceVariant }]}>
            {t(locale, 'baseline.subtitle')}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={palette.primary} size="large" style={styles.loader} />
        ) : (
          <>
            {/* Demographics */}
            <View
              style={[
                styles.card,
                { backgroundColor: palette.surface, shadowColor: palette.shadow },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: palette.secondaryContainer }]}>
                  <Text style={[styles.sectionIconGlyph, { color: palette.primary }]}>👤</Text>
                </View>
                <Text style={[styles.sectionTitle, { color: palette.onSurface }]}>
                  {t(locale, 'baseline.demographics')}
                </Text>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[styles.capsLabel, { color: palette.primary }]}>
                  {t(locale, 'baseline.sex')}
                </Text>
                <View style={styles.sexGrid}>
                  {sexOptions.map((option) => {
                    const selected = draft.sex === option.value;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        key={option.value}
                        onPress={() => setDraft((value) => ({ ...value, sex: option.value }))}
                        style={({ pressed }) => [
                          styles.sexCard,
                          {
                            backgroundColor: palette.surfaceContainerLow,
                            borderColor: selected ? palette.primary : 'transparent',
                          },
                          selected && {
                            backgroundColor: dark
                              ? palette.surfaceContainer
                              : 'rgba(166, 53, 83, 0.05)',
                          },
                          pressed && styles.cardPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.sexIcon,
                            { color: selected ? palette.primary : palette.outline },
                          ]}
                        >
                          {option.icon}
                        </Text>
                        <Text
                          style={[
                            styles.sexLabel,
                            {
                              color: selected ? palette.onSurface : palette.onSurfaceVariant,
                              fontWeight: selected ? '600' : '500',
                            },
                          ]}
                        >
                          {t(locale, option.key)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <FormField
                keyboardType="number-pad"
                label={t(locale, 'baseline.birthYear')}
                labelStyle={fieldLabelStyle}
                onChangeText={(value) =>
                  setDraft((state) => ({ ...state, birthYear: optionalNumber(value) }))
                }
                placeholder={t(locale, 'baseline.birthYearPlaceholder')}
                style={pillInputStyle}
                value={draft.birthYear?.toString() ?? ''}
              />
              <FormField
                enableVoice
                label={t(locale, 'baseline.occupation')}
                labelStyle={fieldLabelStyle}
                onChangeText={(value) => setDraft((state) => ({ ...state, occupation: value }))}
                placeholder={t(locale, 'baseline.occupationPlaceholder')}
                style={pillInputStyle}
                value={draft.occupation ?? ''}
              />
            </View>

            {/* Medical Background */}
            <View
              style={[
                styles.card,
                { backgroundColor: palette.surface, shadowColor: palette.shadow },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: palette.secondaryContainer }]}>
                  <Text style={[styles.sectionIconGlyph, { color: palette.primary }]}>✚</Text>
                </View>
                <Text style={[styles.sectionTitle, { color: palette.onSurface }]}>
                  {t(locale, 'baseline.medicalBackground')}
                </Text>
              </View>

              <View style={styles.toggleRow}>
                <Text style={[styles.toggleQuestion, { color: palette.onSurface }]}>
                  {t(locale, 'baseline.chronicDiseases')}
                </Text>
                <YesNoToggle
                  noLabel={t(locale, 'common.no')}
                  onChange={(answer) => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setHasChronicDiseases(answer);
                    if (!answer) {
                      setHasChronicTherapy(false);
                      setDraft((value) => ({
                        ...value,
                        chronicDiseases: '',
                        chronicTherapy: '',
                      }));
                      setChronicDiseaseNames(['']);
                      setChronicTherapies([{ name: '', dose: '' }]);
                    }
                  }}
                  palette={palette}
                  value={hasChronicDiseases}
                  yesLabel={t(locale, 'common.yes')}
                />
              </View>

              {hasChronicDiseases ? (
                <View style={styles.conditionalBlock}>
                  {chronicDiseaseNames.map((name, index) => (
                    <View key={index} style={styles.repeatableBlock}>
                      <FormField
                        enableVoice
                        label={t(locale, 'baseline.chronicDiseaseName')}
                        labelStyle={softFieldLabelStyle}
                        onChangeText={(value) => {
                          const next = chronicDiseaseNames.map((currentName, currentIndex) =>
                            currentIndex === index ? value : currentName,
                          );
                          setChronicDiseaseNames(next);
                          setDraft((state) => ({
                            ...state,
                            chronicDiseases: serializeDiseaseNames(next),
                          }));
                        }}
                        placeholder={t(locale, 'baseline.diseaseNamePlaceholder')}
                        style={pillInputStyle}
                        value={name}
                      />
                      {chronicDiseaseNames.length > 1 ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            const next = chronicDiseaseNames.filter(
                              (_current, currentIndex) => currentIndex !== index,
                            );
                            setChronicDiseaseNames(next);
                            setDraft((state) => ({
                              ...state,
                              chronicDiseases: serializeDiseaseNames(next),
                            }));
                          }}
                          style={styles.removeButton}
                        >
                          <Text style={[styles.removeButtonText, { color: palette.error }]}>
                            {t(locale, 'common.remove')}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setChronicDiseaseNames((currentNames) => [...currentNames, ''])}
                    style={({ pressed }) => [
                      styles.addButton,
                      {
                        borderColor: dark ? palette.outlineVariant : 'rgba(166, 53, 83, 0.2)',
                      },
                      pressed && styles.cardPressed,
                    ]}
                  >
                    <Text style={[styles.addButtonText, { color: palette.primary }]}>
                      + {t(locale, 'baseline.addChronicDisease')}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={[styles.divider, { backgroundColor: palette.surfaceContainer }]} />

              <View style={styles.toggleRow}>
                <Text style={[styles.toggleQuestion, { color: palette.onSurface }]}>
                  {t(locale, 'baseline.chronicTherapy')}
                </Text>
                <YesNoToggle
                  noLabel={t(locale, 'common.no')}
                  onChange={(answer) => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setHasChronicTherapy(answer);
                    if (!answer) {
                      setDraft((value) => ({ ...value, chronicTherapy: '' }));
                      setChronicTherapies([{ name: '', dose: '' }]);
                    }
                  }}
                  palette={palette}
                  value={hasChronicTherapy}
                  yesLabel={t(locale, 'common.yes')}
                />
              </View>

              {hasChronicTherapy ? (
                <View style={styles.conditionalBlock}>
                  {chronicTherapies.map((therapy, index) => (
                    <View key={index} style={styles.repeatableBlock}>
                      <FormField
                        autoCapitalize="words"
                        enableVoice
                        label={t(locale, 'baseline.chronicTherapyName')}
                        labelStyle={softFieldLabelStyle}
                        onChangeText={(value) => {
                          const next = chronicTherapies.map((currentTherapy, currentIndex) =>
                            currentIndex === index
                              ? { ...currentTherapy, name: value }
                              : currentTherapy,
                          );
                          setChronicTherapies(next);
                          setDraft((state) => ({
                            ...state,
                            chronicTherapy: serializeChronicTherapies(next),
                          }));
                        }}
                        placeholder={t(locale, 'baseline.medicineNamePlaceholder')}
                        style={pillInputStyle}
                        value={therapy.name}
                      />
                      <FormField
                        enableVoice
                        label={t(locale, 'baseline.chronicTherapyDose')}
                        labelStyle={softFieldLabelStyle}
                        onChangeText={(value) => {
                          const next = chronicTherapies.map((currentTherapy, currentIndex) =>
                            currentIndex === index
                              ? { ...currentTherapy, dose: value }
                              : currentTherapy,
                          );
                          setChronicTherapies(next);
                          setDraft((state) => ({
                            ...state,
                            chronicTherapy: serializeChronicTherapies(next),
                          }));
                        }}
                        placeholder={t(locale, 'baseline.dosePlaceholder')}
                        style={pillInputStyle}
                        value={therapy.dose}
                      />
                      {chronicTherapies.length > 1 ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            const next = chronicTherapies.filter(
                              (_current, currentIndex) => currentIndex !== index,
                            );
                            setChronicTherapies(next);
                            setDraft((state) => ({
                              ...state,
                              chronicTherapy: serializeChronicTherapies(next),
                            }));
                          }}
                          style={styles.removeButton}
                        >
                          <Text style={[styles.removeButtonText, { color: palette.error }]}>
                            {t(locale, 'common.remove')}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      setChronicTherapies((currentTherapies) => [
                        ...currentTherapies,
                        { name: '', dose: '' },
                      ])
                    }
                    style={({ pressed }) => [
                      styles.addButton,
                      {
                        borderColor: dark ? palette.outlineVariant : 'rgba(166, 53, 83, 0.2)',
                      },
                      pressed && styles.cardPressed,
                    ]}
                  >
                    <Text style={[styles.addButtonText, { color: palette.primary }]}>
                      + {t(locale, 'baseline.addChronicTherapy')}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            {/* Measurements */}
            <View
              style={[
                styles.card,
                { backgroundColor: palette.surface, shadowColor: palette.shadow },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: palette.secondaryContainer }]}>
                  <Text style={[styles.sectionIconGlyph, { color: palette.primary }]}>⛶</Text>
                </View>
                <Text style={[styles.sectionTitle, { color: palette.onSurface }]}>
                  {t(locale, 'baseline.measurements')}
                </Text>
              </View>

              <View style={styles.measureRow}>
                <View style={styles.measureField}>
                  <FormField
                    keyboardType="decimal-pad"
                    label={t(locale, 'baseline.heightCm')}
                    labelStyle={fieldLabelStyle}
                    onChangeText={(value) =>
                      setDraft((state) => ({ ...state, heightCm: optionalNumber(value) }))
                    }
                    placeholder={t(locale, 'baseline.heightPlaceholder')}
                    style={pillInputStyle}
                    value={draft.heightCm?.toString() ?? ''}
                  />
                </View>
                <View style={styles.measureField}>
                  <FormField
                    keyboardType="decimal-pad"
                    label={t(locale, 'baseline.weightKg')}
                    labelStyle={fieldLabelStyle}
                    onChangeText={(value) =>
                      setDraft((state) => ({ ...state, weightKg: optionalNumber(value) }))
                    }
                    placeholder={t(locale, 'baseline.weightPlaceholder')}
                    style={pillInputStyle}
                    value={draft.weightKg?.toString() ?? ''}
                  />
                </View>
              </View>

              <View
                style={[styles.weightChangeRow, { backgroundColor: palette.surfaceContainerLow }]}
              >
                <View style={styles.weightChangeCopy}>
                  <Text style={[styles.toggleQuestion, { color: palette.onSurface }]}>
                    {t(locale, 'baseline.recentWeightChange')}
                  </Text>
                  <Text style={[styles.weightChangeHelp, { color: palette.onSurfaceVariant }]}>
                    {t(locale, 'baseline.recentWeightChangeHelp')}
                  </Text>
                </View>
                <YesNoToggle
                  noLabel={t(locale, 'common.no')}
                  onChange={(answer) => selectWeightChange(answer ? 'yes' : 'no')}
                  palette={palette}
                  value={
                    draft.recentMajorWeightChange === 'yes'
                      ? true
                      : draft.recentMajorWeightChange === 'no'
                        ? false
                        : undefined
                  }
                  yesLabel={t(locale, 'common.yes')}
                />
              </View>

              {draft.recentMajorWeightChange === 'yes' ? (
                <FormField
                  enableVoice
                  label={t(locale, 'baseline.recentWeightChangeDescription')}
                  labelStyle={softFieldLabelStyle}
                  multiline
                  onChangeText={(value) =>
                    setDraft((state) => ({
                      ...state,
                      recentMajorWeightChangeDescription: value,
                    }))
                  }
                  style={[pillInputStyle, styles.multilineInput]}
                  value={draft.recentMajorWeightChangeDescription ?? ''}
                />
              ) : null}
            </View>

            {/* Women's Health — female only */}
            {draft.sex === 'female' ? (
              <View
                style={[
                  styles.card,
                  { backgroundColor: palette.surface, shadowColor: palette.shadow },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[styles.sectionIcon, { backgroundColor: palette.secondaryContainer }]}
                  >
                    <Text style={[styles.sectionIconGlyph, { color: palette.primary }]}>♀</Text>
                  </View>
                  <Text style={[styles.sectionTitle, { color: palette.onSurface }]}>
                    {t(locale, 'baseline.womensHealth')}
                  </Text>
                </View>
                <FormField
                  enableVoice
                  label={t(locale, 'baseline.menstrualHistory')}
                  labelStyle={fieldLabelStyle}
                  multiline
                  onChangeText={(value) =>
                    setDraft((state) => ({ ...state, menstrualHistory: value }))
                  }
                  placeholder={t(locale, 'baseline.menstrualHistoryPlaceholder')}
                  style={[pillInputStyle, styles.multilineInput]}
                  value={draft.menstrualHistory ?? ''}
                />
              </View>
            ) : null}

            {/* Privacy note */}
            <View
              style={[
                styles.privacyCard,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.surfaceContainer,
                  shadowColor: palette.shadow,
                },
              ]}
            >
              <Text style={[styles.privacyIcon, { color: palette.primary }]}>🔒</Text>
              <Text style={[styles.privacyText, { color: palette.onSurfaceVariant }]}>
                {t(locale, 'baseline.privacyNote')}
              </Text>
            </View>

            {error ? (
              <StatusMessage
                message={error}
                style={[styles.statusError, { color: palette.error }]}
                tone="error"
              />
            ) : null}
            {message ? (
              <StatusMessage
                message={message}
                style={[styles.statusSuccess, { color: palette.primary }]}
                tone="success"
              />
            ) : null}

            {/* Save */}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: saving }}
              disabled={saving}
              onPress={() => void save()}
              style={({ pressed }) => [
                styles.saveButton,
                {
                  backgroundColor: palette.primaryContainer,
                  shadowColor: palette.primary,
                },
                pressed && styles.cardPressed,
                saving && styles.disabled,
              ]}
            >
              {saving ? (
                <ActivityIndicator color={palette.onPrimaryContainer} />
              ) : (
                <>
                  <Text style={[styles.saveIcon, { color: palette.onPrimaryContainer }]}>💾</Text>
                  <Text style={[styles.saveLabel, { color: palette.onPrimaryContainer }]}>
                    {t(locale, 'baseline.saveProfile')}
                  </Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </KeyboardAwareScrollView>

      <PatientBottomNav
        navigationDisabled={saving}
        active="profile"
        onProfile={() => undefined}
        onSettings={() => confirmDiscard(onOpenSettings ?? onBack)}
        onTimeline={() => confirmDiscard(onOpenTimeline ?? onBack)}
        onToday={() => confirmDiscard(onBack)}
        palette={{
          background: dark ? colors.surface : 'rgba(241, 236, 242, 0.92)',
          onPrimaryContainer: dark ? palette.onPrimaryContainer : stitch.onPrimaryContainer,
          onSurfaceVariant: palette.onSurfaceVariant,
          primaryContainer: dark ? palette.primaryContainer : stitch.primaryContainer,
          shadow: palette.shadow,
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  content: {
    flexGrow: 1,
    gap: 24,
    paddingBottom: 140,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  pressed: { opacity: 0.72 },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  disabled: { opacity: 0.5 },
  loader: { marginTop: 40 },
  loadFailure: {
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  headerBlock: {
    gap: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  pageSubtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    borderRadius: 24,
    elevation: 2,
    gap: 20,
    padding: 24,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  sectionIcon: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  sectionIconGlyph: {
    fontSize: 22,
    fontWeight: '700',
  },
  sectionTitle: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  fieldBlock: {
    gap: 12,
  },
  capsLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
  },
  sexGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sexCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    flexBasis: '47%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  sexIcon: {
    fontSize: 20,
    fontWeight: '700',
  },
  sexLabel: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  toggleQuestion: {
    flex: 1,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  yesNoTrack: {
    borderRadius: 999,
    flexDirection: 'row',
    padding: 4,
    width: 112,
  },
  yesNoItem: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  yesNoLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  conditionalBlock: {
    gap: 14,
  },
  repeatableBlock: {
    gap: 8,
  },
  addButton: {
    alignItems: 'center',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  removeButton: {
    alignSelf: 'flex-end',
    justifyContent: 'center',
    minHeight: 32,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  measureRow: {
    flexDirection: 'row',
    gap: 16,
  },
  measureField: {
    flex: 1,
  },
  weightChangeRow: {
    alignItems: 'center',
    borderRadius: 24,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 16,
  },
  weightChangeCopy: {
    flex: 1,
    flexShrink: 1,
    gap: 2,
  },
  weightChangeHelp: {
    fontSize: 11,
    lineHeight: 14,
  },
  multilineInput: {
    borderRadius: 24,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  privacyCard: {
    borderRadius: 24,
    borderWidth: 1,
    elevation: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  privacyIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  statusError: {
    fontSize: 15,
    lineHeight: 22,
  },
  statusSuccess: {
    fontSize: 15,
    lineHeight: 22,
  },
  saveButton: {
    alignItems: 'center',
    borderRadius: 999,
    elevation: 4,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 24,
    paddingVertical: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  saveIcon: {
    fontSize: 20,
  },
  saveLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
});
