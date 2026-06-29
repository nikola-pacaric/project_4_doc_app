import type { FoodFormDetails, UserProfile } from '@project4/contracts';
import {
  foodHydrationDefaults,
  getStartedMeals,
  getStartedOtherFluids,
  mealDraftDefaults,
  normalizeFoodWaterLiters,
  parseOtherFluids,
  serializeOtherFluids,
  validateFoodHydration,
  validateMealProgress,
  validateOtherFluidProgress,
  type FoodHydrationDraft,
  type MealDraft,
  type OtherFluidDraft,
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
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FormField } from '../components/FormField';
import { MealFields } from '../components/MealFields';
import { OptionButtons } from '../components/OptionButtons';
import { OtherFluidFields } from '../components/OtherFluidFields';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, sharedStyles } from '../theme';
import { localDayRange, toLocalDateInput, toLocalTimeInput } from '../utils/dateTime';

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
        occurredAt: toLocalDateTime(new Date(meal.occurredAt)),
        type: meal.type ?? undefined,
        name: meal.name ?? '',
        description: meal.description ?? '',
      }))
    : [createEmptyMealDraft()];
}

function toLocalDateTime(value: Date): string {
  return `${toLocalDateInput(value)} ${toLocalTimeInput(value)}`;
}

function createEmptyMealDraft(): MealDraft {
  return { ...mealDraftDefaults, occurredAt: toLocalDateTime(new Date()) };
}

function createEmptyOtherFluidDraft(): OtherFluidDraft {
  return { occurredAt: toLocalDateTime(new Date()) };
}

function toValidLocalDateTime(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : toLocalDateTime(date);
}

function toOtherFluidDrafts(value: string | null | undefined): OtherFluidDraft[] {
  const parsedFluids = parseOtherFluids(value);
  if (!parsedFluids.length) return [createEmptyOtherFluidDraft()];

  return parsedFluids.map((fluid) => {
    return {
      occurredAt: toValidLocalDateTime(fluid.occurredAt) ?? toLocalDateTime(new Date()),
      name: fluid.name ?? '',
    };
  });
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
  const [meals, setMeals] = useState<MealDraft[]>([createEmptyMealDraft()]);
  const [otherFluids, setOtherFluids] = useState<OtherFluidDraft[]>([
    createEmptyOtherFluidDraft(),
  ]);
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
        setOtherFluids(toOtherFluidDrafts(nextHydration.otherFluids));
      })
      .catch(() => active && setError(t(locale, 'food.loadError')))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [client, day, locale, profile.id]);

  async function save() {
    const startedMeals = getStartedMeals(meals);
    const startedOtherFluids = getStartedOtherFluids(otherFluids);
    const normalizedWaterText = normalizeWaterLitersText(waterText);
    const normalizedHydration: FoodHydrationDraft = {
      ...hydration,
      waterLiters: parseWaterLitersInput(normalizedWaterText),
      otherFluids: hydration.hasOtherFluids ? serializeOtherFluids(startedOtherFluids) : '',
    };

    setWaterText(normalizedWaterText);
    setHydration(normalizedHydration);

    if (
      !validateFoodHydration(normalizedHydration).valid ||
      !validateMealProgress(meals) ||
      (normalizedHydration.hasOtherFluids &&
        (!startedOtherFluids.length || !validateOtherFluidProgress(otherFluids)))
    ) {
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
      setOtherFluids(toOtherFluidDrafts(nextHydration.otherFluids));
      setMessage(t(locale, 'food.saved'));
      onSaved();
    } catch {
      setError(t(locale, 'food.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={sharedStyles.formScreen}>
      <ScrollView
        contentContainerStyle={sharedStyles.formScrollContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader eyebrow={t(locale, 'role.patient')} title={t(locale, 'food.title')} />
        <Text style={sharedStyles.body}>{t(locale, 'food.subtitle')}</Text>

        {loading ? <ActivityIndicator color={colors.accent} size="large" /> : null}
        {!loading ? (
          <View style={styles.form}>
            <MealFields createMeal={createEmptyMealDraft} meals={meals} onChange={setMeals} />
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
            </View>
            <OptionButtons
              label={t(locale, 'food.otherFluids')}
              onChange={(value) =>
                setHydration((current) => ({
                  ...current,
                  hasOtherFluids: value === 'yes',
                  otherFluids: value === 'yes' ? current.otherFluids : '',
                }))
              }
              options={[
                { value: 'yes', label: t(locale, 'common.yes') },
                { value: 'no', label: t(locale, 'common.no') },
              ]}
              value={
                hydration.hasOtherFluids === undefined
                  ? undefined
                  : hydration.hasOtherFluids
                    ? 'yes'
                    : 'no'
              }
            />
            {hydration.hasOtherFluids ? (
              <OtherFluidFields
                createFluid={createEmptyOtherFluidDraft}
                fluids={otherFluids}
                onChange={setOtherFluids}
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
    </SafeAreaView>
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
