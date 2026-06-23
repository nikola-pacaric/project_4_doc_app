import type { FoodFormDetails, UserProfile } from '@project4/contracts';
import {
  foodHydrationDefaults,
  getStartedMeals,
  normalizeFoodWaterLiters,
  validateFoodHydration,
  validateMealProgress,
  type FoodHydrationDraft,
  type MealDraft,
} from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import {
  getPatientFoodForm,
  listPatientMeals,
  savePatientFoodForm,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { spacing } from '@project4/ui-tokens';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ConditionalTextField } from '../components/ConditionalTextField';
import { FormField } from '../components/FormField';
import { MealFields } from '../components/MealFields';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, sharedStyles } from '../theme';
import { localDayRange, toLocalDateInput } from '../utils/dateTime';

interface FoodFormScreenProps {
  client: AppSupabaseClient;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

function toHydrationDraft(details: FoodFormDetails | null): FoodHydrationDraft {
  if (!details) return { ...foodHydrationDefaults };
  return {
    waterLiters: details.waterLiters ?? undefined,
    hasOtherFluids: details.hasOtherFluids ?? Boolean(details.otherFluids?.trim()),
    otherFluids: details.otherFluids ?? '',
  };
}

function toMealDrafts(records: Awaited<ReturnType<typeof listPatientMeals>>): MealDraft[] {
  return records.length
    ? records.map((meal) => ({
        entryId: meal.entryId,
        type: meal.type ?? undefined,
        name: meal.name ?? '',
        description: meal.description ?? '',
      }))
    : [{ description: '' }];
}

function formatWaterLiters(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

function parseWaterLitersInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/[.,]$/.test(trimmed)) return undefined;

  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? normalizeFoodWaterLiters(parsed) : Number.NaN;
}

function normalizeWaterLitersText(value: string): string {
  const parsed = parseWaterLitersInput(value);
  return parsed === undefined || Number.isNaN(parsed) ? value : String(parsed);
}

export function FoodFormScreen({ client, onBack, onSaved, profile }: FoodFormScreenProps) {
  const locale = DEFAULT_LOCALE;
  const today = toLocalDateInput(new Date());
  const day = today;
  const [hydration, setHydration] = useState<FoodHydrationDraft>({ ...foodHydrationDefaults });
  const [waterText, setWaterText] = useState('');
  const [meals, setMeals] = useState<MealDraft[]>([{ description: '' }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const range = localDayRange(day);

    void Promise.all([
      getPatientFoodForm(client, profile.id, range.start, range.end),
      listPatientMeals(client, profile.id, range.start, range.end),
    ])
      .then(([foodRecord, mealRecords]) => {
        if (!active) return;
        const nextHydration = toHydrationDraft(foodRecord?.details ?? null);
        setHydration(nextHydration);
        setWaterText(formatWaterLiters(nextHydration.waterLiters));
        setMeals(toMealDrafts(mealRecords));
      })
      .catch(() => active && setError(t(locale, 'food.loadError')))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [client, day, locale, profile.id]);

  async function save() {
    const startedMeals = getStartedMeals(meals);
    const normalizedWaterText = normalizeWaterLitersText(waterText);
    const normalizedHydration: FoodHydrationDraft = {
      ...hydration,
      waterLiters: parseWaterLitersInput(normalizedWaterText),
    };

    setWaterText(normalizedWaterText);
    setHydration(normalizedHydration);

    if (!validateFoodHydration(normalizedHydration).valid || !validateMealProgress(meals)) {
      setError(t(locale, 'food.requiredError'));
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const range = localDayRange(day);
      await savePatientFoodForm(client, range, normalizedHydration, startedMeals);

      const [foodRecord, mealRecords] = await Promise.all([
        getPatientFoodForm(client, profile.id, range.start, range.end),
        listPatientMeals(client, profile.id, range.start, range.end),
      ]);
      const nextHydration = toHydrationDraft(foodRecord?.details ?? null);
      setHydration(nextHydration);
      setWaterText(formatWaterLiters(nextHydration.waterLiters));
      setMeals(toMealDrafts(mealRecords));
      setMessage(t(locale, 'food.saved'));
      onSaved();
    } catch {
      setError(t(locale, 'food.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={sharedStyles.scrollContent}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={sharedStyles.screen}
    >
      <ScreenHeader eyebrow={t(locale, 'role.patient')} title={t(locale, 'food.title')} />
      <Text style={sharedStyles.body}>{t(locale, 'food.subtitle')}</Text>

      {loading ? <ActivityIndicator color={colors.accent} size="large" /> : null}
      {!loading ? (
        <View style={styles.form}>
          <MealFields meals={meals} onChange={setMeals} />
          <View style={styles.hydrationCard}>
            <Text style={styles.sectionTitle}>{t(locale, 'food.waterTitle')}</Text>
            <FormField
              keyboardType="decimal-pad"
              label={t(locale, 'food.waterAmountLiters')}
              onBlur={() => setWaterText((current) => normalizeWaterLitersText(current))}
              onChangeText={(value) => {
                setWaterText(value);
                setHydration((current) => ({
                  ...current,
                  waterLiters: parseWaterLitersInput(value),
                }));
              }}
              placeholder="2.0"
              value={waterText}
            />
            <ConditionalTextField
              answer={hydration.hasOtherFluids}
              detailKey="food.otherFluidsDetails"
              onAnswerChange={(answer) =>
                setHydration((current) => ({
                  ...current,
                  hasOtherFluids: answer,
                  otherFluids: answer ? current.otherFluids : '',
                }))
              }
              onTextChange={(otherFluids) =>
                setHydration((current) => ({ ...current, otherFluids }))
              }
              questionKey="food.otherFluids"
              text={hydration.otherFluids ?? ''}
            />
          </View>

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
                accessibilityLabel={t(locale, 'common.save')}
                busy={saving}
                label={t(locale, 'common.save')}
                onPress={() => void save()}
              />
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  hydrationCard: {
    backgroundColor: '#fffafb',
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: '800' },
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
