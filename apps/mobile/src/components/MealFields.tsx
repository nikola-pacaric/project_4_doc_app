import { isMealDraftStarted, type MealDraft, type MealType } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import { formatTimeInput, toLocalDateInput } from '../utils/dateTime';
import { FormField } from './FormField';
import { PrimaryButton } from './PrimaryButton';
import { SelectField } from './SelectField';

interface MealFieldsProps {
  createMeal: () => MealDraft;
  meals: MealDraft[];
  onChange: (meals: MealDraft[]) => void;
}

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];

export function MealFields({ createMeal, meals, onChange }: MealFieldsProps) {
  const locale = DEFAULT_LOCALE;

  function updateMeal(index: number, update: Partial<MealDraft>) {
    onChange(meals.map((meal, mealIndex) => (mealIndex === index ? { ...meal, ...update } : meal)));
  }

  function removeMeal(index: number) {
    const remainingMeals = meals.filter((_, mealIndex) => mealIndex !== index);
    onChange(remainingMeals.length ? remainingMeals : [createMeal()]);
  }

  function updateMealTime(index: number, value: string) {
    const current = meals[index];
    const date = current?.occurredAt?.slice(0, 10) ?? toLocalDateInput(new Date());
    const time = current?.occurredAt?.slice(11, 16) ?? '';
    updateMeal(index, { occurredAt: `${date} ${formatTimeInput(value, time, 23)}` });
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t(locale, 'meal.sectionTitle')}</Text>
      <Text style={styles.help}>{t(locale, 'meal.sectionHelp')}</Text>
      {meals.map((meal, index) => (
        <View style={styles.card} key={meal.entryId ?? `new-${index}`}>
          <FormField
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            label={t(locale, 'meal.time')}
            maxLength={5}
            onChangeText={(value) => updateMealTime(index, value)}
            placeholder={t(locale, 'meal.timePlaceholder')}
            value={meal.occurredAt?.slice(11, 16) ?? ''}
          />
          <SelectField
            label={t(locale, 'meal.type')}
            onChange={(value) => updateMeal(index, { type: value as MealType })}
            options={mealTypes.map((type) => ({
              value: type,
              label: t(locale, `meal.type.${type}`),
            }))}
            placeholder={t(locale, 'meal.selectType')}
            value={meal.type}
          />
          {meal.type ? (
            <View style={styles.details}>
              <FormField
                label={t(locale, 'meal.name')}
                onChangeText={(value) => updateMeal(index, { name: value })}
                value={meal.name ?? ''}
              />
              <FormField
                label={t(locale, 'meal.description')}
                multiline
                onChangeText={(value) => updateMeal(index, { description: value })}
                value={meal.description ?? ''}
              />
            </View>
          ) : null}
          {meals.length > 1 || isMealDraftStarted(meal) ? (
            <PrimaryButton
              label={t(locale, 'meal.remove')}
              onPress={() => removeMeal(index)}
              variant="danger"
            />
          ) : null}
        </View>
      ))}
      <PrimaryButton
        label={`＋ ${t(locale, 'meal.add')}`}
        onPress={() => onChange([...meals, createMeal()])}
        variant="secondary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: '#fffafb',
    padding: spacing.md,
  },
  title: { color: colors.text, fontSize: 19, fontWeight: '800' },
  help: { color: colors.mutedText, fontSize: 15, lineHeight: 22 },
  card: { gap: spacing.sm },
  details: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: '#fff7f8',
    padding: spacing.md,
  },
});
