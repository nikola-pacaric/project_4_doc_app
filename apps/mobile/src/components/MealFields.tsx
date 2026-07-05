import { isMealDraftStarted, type MealDraft, type MealType } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import { toLocalDateInput } from '../utils/dateTime';
import { FormField } from './FormField';
import { PrimaryButton } from './PrimaryButton';
import { SelectField } from './SelectField';
import { TimePickerField } from './TimePickerField';
import { type PreparedPhoto } from '../screens/PhotoUploadScreen';

export interface ClientMealDraft extends MealDraft {
  existingPhotoUris?: string[];
  localPhoto?: PreparedPhoto | null;
}

interface MealFieldsProps {
  createMeal: () => ClientMealDraft;
  meals: ClientMealDraft[];
  onAddPhoto?: (meal: ClientMealDraft, index: number) => void;
  onChange: (meals: ClientMealDraft[]) => void;
}

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];

export function MealFields({ createMeal, meals, onAddPhoto, onChange }: MealFieldsProps) {
  const locale = DEFAULT_LOCALE;

  function updateMeal(index: number, update: Partial<ClientMealDraft>) {
    onChange(meals.map((meal, mealIndex) => (mealIndex === index ? { ...meal, ...update } : meal)));
  }

  function removeMeal(index: number) {
    const remainingMeals = meals.filter((_, mealIndex) => mealIndex !== index);
    onChange(remainingMeals.length ? remainingMeals : [createMeal()]);
  }

  function updateMealTime(index: number, value: string) {
    const current = meals[index];
    const date = current?.occurredAt?.slice(0, 10) ?? toLocalDateInput(new Date());
    updateMeal(index, { occurredAt: `${date} ${value}` });
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t(locale, 'meal.sectionTitle')}</Text>
      <Text style={styles.help}>{t(locale, 'meal.sectionHelp')}</Text>
      {meals.map((meal, index) => (
        <View style={styles.card} key={meal.entryId ?? `new-${index}`}>
          <TimePickerField
            label={t(locale, 'meal.time')}
            onChange={(value) => updateMealTime(index, value)}
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
          {meal.localPhoto ? (
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: meal.localPhoto.photo.uri }} style={styles.photoPreview} />
              <PrimaryButton
                label={t(locale, 'common.remove')}
                onPress={() => updateMeal(index, { localPhoto: null })}
                variant="danger"
              />
            </View>
          ) : onAddPhoto ? (
            <View style={styles.photoAction}>
              <PrimaryButton
                label={t(locale, 'photo.add')}
                onPress={() => onAddPhoto(meal, index)}
                variant="secondary"
              />
            </View>
          ) : null}
          {meal.existingPhotoUris?.length ? (
            <View style={styles.existingPhotos}>
              {meal.existingPhotoUris.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.photoPreview} />
              ))}
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
  photoAction: { marginTop: spacing.xs },
  details: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: '#fff7f8',
    padding: spacing.md,
  },
  photoPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  photoPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  existingPhotos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
