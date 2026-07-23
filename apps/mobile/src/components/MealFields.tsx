import { isMealDraftStarted, type MealDraft, type MealType } from '@project4/forms';
import { getActiveLocale, t } from '@project4/i18n';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { toLocalDateInput } from '../utils/dateTime';
import {
  getTactilePalette,
  tactileFieldLabelStyle,
  tactileFormLayout as layout,
  tactileMultilineInputStyle,
  tactilePillInputStyle,
} from '../theme/tactileForm';
import { FormField } from './FormField';
import { SelectField } from './SelectField';
import { TimePickerField } from './TimePickerField';
import { type PreparedPhoto } from '../screens/PhotoUploadScreen';
import { type PersistedEntryPhoto } from '../lib/persistedPhotos';

export interface ClientMealDraft extends MealDraft {
  existingPhotos?: PersistedEntryPhoto[];
  localPhoto?: PreparedPhoto | null;
}

interface MealFieldsProps {
  createMeal: () => ClientMealDraft;
  deletingPhotoIds?: ReadonlySet<string>;
  meals: ClientMealDraft[];
  onAddPhoto?: (meal: ClientMealDraft, index: number) => void;
  onChange: (meals: ClientMealDraft[]) => void;
  onDeletePhoto?: (photo: PersistedEntryPhoto, index: number) => void;
}

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];

export function MealFields({
  createMeal,
  deletingPhotoIds = new Set<string>(),
  meals,
  onAddPhoto,
  onChange,
  onDeletePhoto,
}: MealFieldsProps) {
  const locale = getActiveLocale();
  const palette = getTactilePalette();
  // White controls on the soft meal card so fields stay visible.
  const pill = {
    ...tactilePillInputStyle(palette),
    backgroundColor: palette.surface,
    borderColor: palette.outlineVariant,
    borderWidth: 1,
  };
  const multi = {
    ...tactileMultilineInputStyle(palette),
    backgroundColor: palette.surface,
    borderColor: palette.outlineVariant,
    borderWidth: 1,
  };
  const label = tactileFieldLabelStyle(palette);

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
      <Text style={[styles.title, { color: palette.onSurface }]}>
        {t(locale, 'meal.sectionTitle')}
      </Text>
      <Text style={[styles.help, { color: palette.onSurfaceVariant }]}>
        {t(locale, 'meal.sectionHelp')}
      </Text>

      {meals.map((meal, index) => (
        <View
          key={meal.entryId ?? `new-${index}`}
          style={[
            styles.mealCard,
            {
              backgroundColor: palette.surfaceContainerLow,
              borderColor: palette.outlineVariant,
            },
          ]}
        >
          <TimePickerField
            label={t(locale, 'meal.time')}
            labelStyle={label}
            onChange={(value) => updateMealTime(index, value)}
            placeholder={t(locale, 'meal.timePlaceholder')}
            style={pill}
            value={meal.occurredAt?.slice(11, 16) ?? ''}
            valueStyle={{ color: palette.onSurface }}
          />
          <SelectField
            chevronStyle={{ color: palette.primary }}
            label={t(locale, 'meal.type')}
            labelStyle={label}
            menuStyle={{
              backgroundColor: palette.surface,
              borderColor: 'transparent',
              borderRadius: 20,
            }}
            onChange={(value) => updateMeal(index, { type: value as MealType })}
            options={mealTypes.map((type) => ({
              value: type,
              label: t(locale, `meal.type.${type}`),
            }))}
            placeholder={t(locale, 'meal.selectType')}
            style={pill}
            value={meal.type}
            valueStyle={{ color: palette.onSurface }}
          />

          {meal.type ? (
            <View style={styles.details}>
              <FormField
                enableVoice
                label={t(locale, 'meal.name')}
                labelStyle={label}
                onChangeText={(value) => updateMeal(index, { name: value })}
                style={pill}
                value={meal.name ?? ''}
              />
              <FormField
                enableVoice
                label={t(locale, 'meal.description')}
                labelStyle={label}
                multiline
                onChangeText={(value) => updateMeal(index, { description: value })}
                style={multi}
                value={meal.description ?? ''}
              />

              {meal.localPhoto ? (
                <View style={styles.photoRow}>
                  <Image source={{ uri: meal.localPhoto.photo.uri }} style={styles.photo} />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => updateMeal(index, { localPhoto: null })}
                    style={({ pressed }) => [
                      layout.secondaryButton,
                      { borderColor: palette.error, flex: 1 },
                      pressed && layout.pressed,
                    ]}
                  >
                    <Text style={[layout.buttonLabel, { color: palette.error }]}>
                      {t(locale, 'common.remove')}
                    </Text>
                  </Pressable>
                </View>
              ) : onAddPhoto ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onAddPhoto(meal, index)}
                  style={({ pressed }) => [
                    layout.dashedAdd,
                    { borderColor: 'rgba(166, 53, 83, 0.25)' },
                    pressed && layout.pressed,
                  ]}
                >
                  <Text style={{ color: palette.primary, fontSize: 14, fontWeight: '600' }}>
                    {t(locale, 'photo.add')}
                  </Text>
                </Pressable>
              ) : null}

              {meal.existingPhotos?.length ? (
                <View style={styles.savedPhotos}>
                  <Text style={[layout.helpText, { color: palette.onSurface, fontWeight: '700' }]}>
                    {t(locale, 'photo.savedPhotos')}
                  </Text>
                  <View style={styles.photoList}>
                    {meal.existingPhotos.map((photo) => (
                      <View key={photo.id} style={styles.savedPhoto}>
                        <Image source={{ uri: photo.uri }} style={styles.photo} />
                        {onDeletePhoto ? (
                          <Pressable
                            accessibilityRole="button"
                            disabled={deletingPhotoIds.has(photo.id)}
                            onPress={() => onDeletePhoto(photo, index)}
                            style={({ pressed }) => [
                              styles.deletePhotoButton,
                              { borderColor: palette.error },
                              pressed && layout.pressed,
                            ]}
                          >
                            <Text style={[styles.deletePhotoLabel, { color: palette.error }]}>
                              {t(
                                locale,
                                deletingPhotoIds.has(photo.id) ? 'photo.deleting' : 'common.delete',
                              )}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {meals.length > 1 || isMealDraftStarted(meal) ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => removeMeal(index)}
              style={({ pressed }) => [
                layout.primaryButton,
                {
                  backgroundColor: palette.primary,
                  shadowColor: palette.primary,
                },
                pressed && layout.pressed,
              ]}
            >
              <Text style={[layout.buttonLabel, { color: palette.onPrimary }]}>
                {t(locale, 'meal.remove')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      <Pressable
        accessibilityRole="button"
        onPress={() => onChange([...meals, createMeal()])}
        style={({ pressed }) => [
          layout.secondaryButton,
          { borderColor: palette.primary },
          pressed && layout.pressed,
        ]}
      >
        <Text style={[layout.buttonLabel, { color: palette.primary }]}>
          ＋ {t(locale, 'meal.add')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  help: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: -8,
  },
  mealCard: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  details: {
    gap: 14,
  },
  photoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  photo: {
    backgroundColor: '#f1ecf2',
    borderRadius: 12,
    height: 64,
    width: 64,
  },
  savedPhotos: { gap: 10 },
  photoList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  savedPhoto: {
    alignItems: 'center',
    gap: 6,
  },
  deletePhotoButton: {
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deletePhotoLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});
