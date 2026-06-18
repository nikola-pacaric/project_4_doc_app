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

export function BaselineScreen({ client, profile, onBack }: BaselineScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [current, setCurrent] = useState<PatientBaselineProfile | null>(null);
  const [draft, setDraft] = useState<BaselineProfileDraft>({ ...baselineProfileDefaults });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
    if (!isCompleteBaselineProfile(draft)) {
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
    } catch {
      setError(t(locale, 'baseline.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScrollView
        contentContainerStyle={sharedStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader eyebrow={t(locale, 'role.patient')} title={t(locale, 'baseline.title')} />
        <Text style={sharedStyles.body}>{t(locale, 'baseline.subtitle')}</Text>
        <PrimaryButton label={t(locale, 'common.cancel')} onPress={onBack} variant="secondary" />
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
            <FormField
              label={t(locale, 'baseline.chronicDiseases')}
              multiline
              onChangeText={(value) => setDraft((state) => ({ ...state, chronicDiseases: value }))}
              value={draft.chronicDiseases ?? ''}
            />
            <FormField
              label={t(locale, 'baseline.chronicTherapy')}
              multiline
              onChangeText={(value) => setDraft((state) => ({ ...state, chronicTherapy: value }))}
              value={draft.chronicTherapy ?? ''}
            />
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
            <PrimaryButton
              busy={saving}
              label={t(locale, 'common.save')}
              onPress={() => void save()}
            />
            {error ? <Text style={sharedStyles.error}>{error}</Text> : null}
            {message ? <Text style={sharedStyles.success}>{message}</Text> : null}
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
    padding: spacing.md,
  },
});
