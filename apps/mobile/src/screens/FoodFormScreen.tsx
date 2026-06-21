import type { FoodFormDetails, UserProfile } from '@project4/contracts';
import {
  foodHydrationDefaults,
  getStartedMeals,
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
  savePatientMeals,
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
import { isValidTrackedDay, localDayRange, toLocalDateInput } from '../utils/dateTime';

interface FoodFormScreenProps {
  client: AppSupabaseClient;
  onBack: () => void;
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

export function FoodFormScreen({ client, onBack, profile }: FoodFormScreenProps) {
  const locale = DEFAULT_LOCALE;
  const today = toLocalDateInput(new Date());
  const [dayInput, setDayInput] = useState(today);
  const [day, setDay] = useState(today);
  const [hydration, setHydration] = useState<FoodHydrationDraft>({ ...foodHydrationDefaults });
  const [meals, setMeals] = useState<MealDraft[]>([{ description: '' }]);
  const [dayEntryId, setDayEntryId] = useState<string>();
  const [hasFoodDetails, setHasFoodDetails] = useState(false);
  const [previousMealEntryIds, setPreviousMealEntryIds] = useState<string[]>([]);
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
        setDayEntryId(foodRecord?.entryId);
        setHasFoodDetails(Boolean(foodRecord?.details));
        setHydration(toHydrationDraft(foodRecord?.details ?? null));
        setPreviousMealEntryIds(mealRecords.map((meal) => meal.entryId));
        setMeals(toMealDrafts(mealRecords));
      })
      .catch(() => active && setError(t(locale, 'food.loadError')))
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

  async function save() {
    if (!isValidTrackedDay(dayInput)) {
      setError(t(locale, 'daily.dayInvalid'));
      return;
    }

    const startedMeals = getStartedMeals(meals);
    if (!validateFoodHydration(hydration).valid || !validateMealProgress(meals)) {
      setError(t(locale, 'food.requiredError'));
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const range = localDayRange(day);
      const savedDayEntryId = await savePatientFoodForm(
        client,
        profile.id,
        range.occurredAt,
        hydration,
        dayEntryId,
        hasFoodDetails,
      );
      await savePatientMeals(
        client,
        profile.id,
        range.occurredAt,
        startedMeals,
        previousMealEntryIds,
      );

      const [foodRecord, mealRecords] = await Promise.all([
        getPatientFoodForm(client, profile.id, range.start, range.end),
        listPatientMeals(client, profile.id, range.start, range.end),
      ]);
      setDayEntryId(foodRecord?.entryId ?? savedDayEntryId);
      setHasFoodDetails(Boolean(foodRecord?.details));
      setHydration(toHydrationDraft(foodRecord?.details ?? null));
      setPreviousMealEntryIds(mealRecords.map((meal) => meal.entryId));
      setMeals(toMealDrafts(mealRecords));
      setMessage(t(locale, 'food.saved'));
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
      <PrimaryButton label={t(locale, 'common.back')} onPress={onBack} variant="secondary" />
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
          <MealFields meals={meals} onChange={setMeals} />
          <View style={styles.hydrationCard}>
            <Text style={styles.sectionTitle}>{t(locale, 'food.waterTitle')}</Text>
            <FormField
              keyboardType="decimal-pad"
              label={t(locale, 'food.waterAmountLiters')}
              onChangeText={(value) =>
                setHydration((current) => ({
                  ...current,
                  waterLiters: value.trim() ? Number(value.replace(',', '.')) : undefined,
                }))
              }
              placeholder="2.0"
              value={hydration.waterLiters?.toString() ?? ''}
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
          <PrimaryButton
            accessibilityLabel={t(locale, 'common.save')}
            busy={saving}
            label={t(locale, 'common.save')}
            onPress={() => void save()}
          />
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
});
