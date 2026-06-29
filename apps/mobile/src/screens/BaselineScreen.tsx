import type { PatientBaselineProfile, PatientSex, UserProfile } from '@project4/contracts';
import {
  baselineProfileDefaults,
  isCompleteBaselineProfile,
  parseRecentMajorWeightChange,
  type BaselineProfileDraft,
} from '@project4/forms';
import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';
import {
  getPatientBaseline,
  savePatientBaseline,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { spacing } from '@project4/ui-tokens';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';

import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, sharedStyles } from '../theme';

interface BaselineScreenProps {
  client: AppSupabaseClient;
  profile: UserProfile;
  onBack: () => void;
}

const sexOptions: Array<{ value: PatientSex; key: TranslationKey }> = [
  { value: 'female', key: 'baseline.sexFemale' },
  { value: 'male', key: 'baseline.sexMale' },
  { value: 'other', key: 'baseline.sexOther' },
  { value: 'prefer_not_to_say', key: 'baseline.sexPreferNot' },
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

export function BaselineScreen({ client, profile, onBack }: BaselineScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [current, setCurrent] = useState<PatientBaselineProfile | null>(null);
  const [draft, setDraft] = useState<BaselineProfileDraft>({ ...baselineProfileDefaults });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [hasChronicDiseases, setHasChronicDiseases] = useState<boolean>();
  const [hasChronicTherapy, setHasChronicTherapy] = useState<boolean>();
  const [chronicDiseaseNames, setChronicDiseaseNames] = useState<string[]>(['']);
  const [chronicTherapies, setChronicTherapies] = useState<ChronicTherapyInput[]>([
    { name: '', dose: '' },
  ]);

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
        if (active) setError(t(locale, 'baseline.loadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client, locale, profile.id]);

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
    <SafeAreaView style={sharedStyles.formScreen}>
      <ScrollView
        contentContainerStyle={sharedStyles.formScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader eyebrow={t(locale, 'role.patient')} title={t(locale, 'baseline.title')} />
        <Text style={sharedStyles.body}>{t(locale, 'baseline.subtitle')}</Text>
        {loading ? <ActivityIndicator color={colors.accent} size="large" /> : null}
        {!loading ? (
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={sharedStyles.fieldLabel}>{t(locale, 'baseline.sex')}</Text>
              <View style={styles.optionGrid}>
                {sexOptions.map((option) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: draft.sex === option.value }}
                    key={option.value}
                    onPress={() => setDraft((value) => ({ ...value, sex: option.value }))}
                    style={[styles.option, draft.sex === option.value && styles.optionSelected]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        draft.sex === option.value && styles.optionTextSelected,
                      ]}
                    >
                      {t(locale, option.key)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <FormField
              keyboardType="number-pad"
              label={t(locale, 'baseline.birthYear')}
              onChangeText={(value) =>
                setDraft((state) => ({ ...state, birthYear: optionalNumber(value) }))
              }
              value={draft.birthYear?.toString() ?? ''}
            />
            <FormField
              label={t(locale, 'baseline.occupation')}
              onChangeText={(value) => setDraft((state) => ({ ...state, occupation: value }))}
              value={draft.occupation ?? ''}
            />
            <FormField
              keyboardType="decimal-pad"
              label={t(locale, 'baseline.weightKg')}
              onChangeText={(value) =>
                setDraft((state) => ({ ...state, weightKg: optionalNumber(value) }))
              }
              value={draft.weightKg?.toString() ?? ''}
            />
            <FormField
              keyboardType="decimal-pad"
              label={t(locale, 'baseline.heightCm')}
              onChangeText={(value) =>
                setDraft((state) => ({ ...state, heightCm: optionalNumber(value) }))
              }
              value={draft.heightCm?.toString() ?? ''}
            />
            <View style={styles.field}>
              <Text style={sharedStyles.fieldLabel}>
                {t(locale, 'baseline.recentWeightChange')}
              </Text>
              <View accessibilityRole="radiogroup" style={styles.optionGrid}>
                {(['yes', 'no'] as const).map((answer) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: draft.recentMajorWeightChange === answer }}
                    key={answer}
                    onPress={() => selectWeightChange(answer)}
                    style={[
                      styles.option,
                      draft.recentMajorWeightChange === answer && styles.optionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        draft.recentMajorWeightChange === answer && styles.optionTextSelected,
                      ]}
                    >
                      {t(locale, answer === 'yes' ? 'common.yes' : 'common.no')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {draft.recentMajorWeightChange === 'yes' ? (
              <View style={styles.conditionalBubble}>
                <FormField
                  label={t(locale, 'baseline.recentWeightChangeDescription')}
                  multiline
                  onChangeText={(value) =>
                    setDraft((state) => ({
                      ...state,
                      recentMajorWeightChangeDescription: value,
                    }))
                  }
                  value={draft.recentMajorWeightChangeDescription ?? ''}
                />
              </View>
            ) : null}
            <View style={styles.field}>
              <Text style={sharedStyles.fieldLabel}>{t(locale, 'baseline.chronicDiseases')}</Text>
              <View accessibilityRole="radiogroup" style={styles.optionGrid}>
                {([true, false] as const).map((answer) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: hasChronicDiseases === answer }}
                    key={String(answer)}
                    onPress={() => {
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
                    style={[styles.option, hasChronicDiseases === answer && styles.optionSelected]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        hasChronicDiseases === answer && styles.optionTextSelected,
                      ]}
                    >
                      {t(locale, answer ? 'common.yes' : 'common.no')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {hasChronicDiseases ? (
              <View style={styles.conditionalBubble}>
                {chronicDiseaseNames.map((name, index) => (
                  <View key={index} style={styles.repeatableRow}>
                    <FormField
                      label={t(locale, 'baseline.chronicDiseaseName')}
                      onChangeText={(value) => {
                        const next = chronicDiseaseNames.map((current, currentIndex) =>
                          currentIndex === index ? value : current,
                        );
                        setChronicDiseaseNames(next);
                        setDraft((state) => ({
                          ...state,
                          chronicDiseases: serializeDiseaseNames(next),
                        }));
                      }}
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
                        <Text style={styles.removeButtonText}>{t(locale, 'common.remove')}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setChronicDiseaseNames((current) => [...current, ''])}
                  style={styles.addButton}
                >
                  <Text style={styles.addButtonText}>
                    + {t(locale, 'baseline.addChronicDisease')}
                  </Text>
                </Pressable>
              </View>
            ) : null}
            <View style={styles.field}>
              <Text style={sharedStyles.fieldLabel}>{t(locale, 'baseline.chronicTherapy')}</Text>
              <View accessibilityRole="radiogroup" style={styles.optionGrid}>
                {([true, false] as const).map((answer) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: hasChronicTherapy === answer }}
                    key={String(answer)}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setHasChronicTherapy(answer);
                      if (!answer) {
                        setDraft((value) => ({ ...value, chronicTherapy: '' }));
                        setChronicTherapies([{ name: '', dose: '' }]);
                      }
                    }}
                    style={[styles.option, hasChronicTherapy === answer && styles.optionSelected]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        hasChronicTherapy === answer && styles.optionTextSelected,
                      ]}
                    >
                      {t(locale, answer ? 'common.yes' : 'common.no')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {hasChronicTherapy ? (
              <View style={styles.conditionalBubble}>
                {chronicTherapies.map((therapy, index) => (
                  <View key={index} style={styles.repeatableRow}>
                    <FormField
                      autoCapitalize="words"
                      label={t(locale, 'baseline.chronicTherapyName')}
                      onChangeText={(value) => {
                        const next = chronicTherapies.map((current, currentIndex) =>
                          currentIndex === index ? { ...current, name: value } : current,
                        );
                        setChronicTherapies(next);
                        setDraft((state) => ({
                          ...state,
                          chronicTherapy: serializeChronicTherapies(next),
                        }));
                      }}
                      value={therapy.name}
                    />
                    <FormField
                      label={t(locale, 'baseline.chronicTherapyDose')}
                      onChangeText={(value) => {
                        const next = chronicTherapies.map((current, currentIndex) =>
                          currentIndex === index ? { ...current, dose: value } : current,
                        );
                        setChronicTherapies(next);
                        setDraft((state) => ({
                          ...state,
                          chronicTherapy: serializeChronicTherapies(next),
                        }));
                      }}
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
                        <Text style={styles.removeButtonText}>{t(locale, 'common.remove')}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    setChronicTherapies((current) => [...current, { name: '', dose: '' }])
                  }
                  style={styles.addButton}
                >
                  <Text style={styles.addButtonText}>
                    + {t(locale, 'baseline.addChronicTherapy')}
                  </Text>
                </Pressable>
              </View>
            ) : null}
            {draft.sex === 'female' ? (
              <FormField
                label={t(locale, 'baseline.menstrualHistory')}
                multiline
                onChangeText={(value) =>
                  setDraft((state) => ({ ...state, menstrualHistory: value }))
                }
                value={draft.menstrualHistory ?? ''}
              />
            ) : null}
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
                  onPress={() => void save()}
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
  field: { gap: spacing.xs },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionSelected: { borderColor: colors.accent, backgroundColor: colors.accent },
  optionText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  optionTextSelected: { color: '#ffffff' },
  conditionalBubble: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: '#fff7f8',
    gap: spacing.md,
    padding: spacing.md,
  },
  repeatableRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  addButton: {
    alignItems: 'center',
    borderColor: colors.accent,
    borderRadius: 10,
    borderStyle: 'dashed',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  addButtonText: { color: colors.accent, fontSize: 15, fontWeight: '800' },
  removeButton: { alignSelf: 'flex-end', minHeight: 36, justifyContent: 'center' },
  removeButtonText: { color: colors.danger, fontSize: 14, fontWeight: '700' },
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
