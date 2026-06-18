import type { MealDraft, MealType } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import { FormField } from './FormField';
import { PrimaryButton } from './PrimaryButton';
import { SelectField } from './SelectField';

interface MealFieldsProps {
  meals: MealDraft[];
  onChange: (meals: MealDraft[]) => void;
}

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];

export function MealFields({ meals, onChange }: MealFieldsProps) {
  const locale = DEFAULT_LOCALE;

  function updateMeal(index: number, update: Partial<MealDraft>) {
    onChange(meals.map((meal, mealIndex) => (mealIndex === index ? { ...meal, ...update } : meal)));
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t(locale, 'meal.sectionTitle')}</Text>
      <Text style={styles.help}>{t(locale, 'meal.sectionHelp')}</Text>
      {meals.map((meal, index) => (
        <View style={styles.card} key={meal.entryId ?? `new-${index}`}>
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
              {meals.length > 1 ? (
                <PrimaryButton
                  label={t(locale, 'meal.remove')}
                  onPress={() => onChange(meals.filter((_, mealIndex) => mealIndex !== index))}
                  variant="danger"
                />
              ) : null}
            </View>
          ) : null}
        </View>
      ))}
      <PrimaryButton
        label={`＋ ${t(locale, 'meal.add')}`}
        onPress={() => onChange([...meals, { description: '' }])}
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
