import { isMealDraftStarted, type MealDraft, type MealType } from '@project4/forms';
import { getActiveLocale, t } from '@project4/i18n';
import { PhotoUploader, type ExistingWebPhoto } from './PhotoUploader';
import { VoiceTextField } from './VoiceTextField';
import type { WebPreparedPhoto } from '../utils/photoHelper';

export interface ClientMealDraft extends MealDraft {
  localId?: string;
  existingPhotos?: ExistingWebPhoto[];
  localPhoto?: WebPreparedPhoto | null;
}

interface MealFieldsProps {
  createMeal: () => ClientMealDraft;
  meals: ClientMealDraft[];
  onChange: (meals: ClientMealDraft[]) => void;
  onDeletePhoto: (mealLocalId: string, photo: ExistingWebPhoto) => Promise<void>;
}

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];

export function MealFields({ createMeal, meals, onChange, onDeletePhoto }: MealFieldsProps) {
  const locale = getActiveLocale();

  function updateMeal(index: number, update: Partial<ClientMealDraft>) {
    onChange(meals.map((meal, mealIndex) => (mealIndex === index ? { ...meal, ...update } : meal)));
  }

  function removeMeal(index: number) {
    const remainingMeals = meals.filter((_, mealIndex) => mealIndex !== index);
    onChange(remainingMeals.length ? remainingMeals : [createMeal()]);
  }

  return (
    <fieldset className="structured-fieldset meal-section">
      <legend>{t(locale, 'meal.sectionTitle')}</legend>
      <p className="field-help">{t(locale, 'meal.sectionHelp')}</p>
      {meals.map((meal, index) => (
        <div className="meal-card" key={meal.localId ?? meal.entryId ?? `new-${index}`}>
          <fieldset className="meal-type-selector">
            <legend>{t(locale, 'meal.type')}</legend>
            <div className="meal-type-grid" role="radiogroup">
              {mealTypes.map((type) => (
                <button
                  aria-checked={meal.type === type}
                  className={meal.type === type ? 'selected' : ''}
                  key={type}
                  onClick={() => updateMeal(index, { type, name: meal.name ?? '' })}
                  role="radio"
                  type="button"
                >
                  {t(locale, `meal.type.${type}`)}
                </button>
              ))}
            </div>
            {!meal.type ? <p>{t(locale, 'meal.selectType')}</p> : null}
          </fieldset>
          {meal.type ? (
            <div className="meal-details conditional-field-bubble">
              <label>
                <span>{t(locale, 'meal.time')}</span>
                <input
                  onChange={(event) =>
                    updateMeal(index, {
                      occurredAt: `${meal.occurredAt?.slice(0, 10) ?? ''} ${event.target.value}`,
                    })
                  }
                  required
                  type="time"
                  value={meal.occurredAt?.slice(11, 16) ?? ''}
                />
              </label>
              <VoiceTextField
                label={t(locale, 'meal.name')}
                onChange={(val) => updateMeal(index, { name: val })}
                required
                type="text"
                value={meal.name ?? ''}
              />
              <VoiceTextField
                label={t(locale, 'meal.description')}
                onChange={(val) => updateMeal(index, { description: val })}
                rows={3}
                type="textarea"
                value={meal.description ?? ''}
              />

              <div style={{ marginBottom: '12px' }}>
                <span className="choice-label" style={{ display: 'block', marginBottom: '6px' }}>
                  {t(locale, 'photo.title')}
                </span>
                <PhotoUploader
                  existingPhotos={meal.existingPhotos}
                  localPhoto={meal.localPhoto}
                  onDeleteExistingPhoto={(photo) =>
                    onDeletePhoto(meal.localId ?? meal.entryId ?? '', photo)
                  }
                  onPhotoSelected={(photo) => updateMeal(index, { localPhoto: photo })}
                />
              </div>

              {meals.length > 1 || isMealDraftStarted(meal) ? (
                <button
                  className="text-button danger"
                  onClick={() => removeMeal(index)}
                  type="button"
                  style={{ marginTop: '8px' }}
                >
                  {t(locale, 'meal.remove')}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
      <button
        className="secondary-button add-meal-button"
        onClick={() => onChange([...meals, createMeal()])}
        type="button"
      >
        <span aria-hidden="true">+</span> {t(locale, 'meal.add')}
      </button>
    </fieldset>
  );
}
