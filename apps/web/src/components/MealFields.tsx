import type { MealDraft, MealType } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';

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

  return (
    <fieldset className="structured-fieldset meal-section">
      <legend>{t(locale, 'meal.sectionTitle')}</legend>
      <p className="field-help">{t(locale, 'meal.sectionHelp')}</p>
      {meals.map((meal, index) => (
        <div className="meal-card" key={meal.entryId ?? `new-${index}`}>
          <label>
            <span>{t(locale, 'meal.type')}</span>
            <select
              onChange={(event) =>
                updateMeal(index, { type: event.target.value as MealType, name: meal.name ?? '' })
              }
              required
              value={meal.type ?? ''}
            >
              <option disabled value="">
                {t(locale, 'meal.selectType')}
              </option>
              {mealTypes.map((type) => (
                <option key={type} value={type}>
                  {t(locale, `meal.type.${type}`)}
                </option>
              ))}
            </select>
          </label>
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
              <label>
                <span>{t(locale, 'meal.name')}</span>
                <input
                  onChange={(event) => updateMeal(index, { name: event.target.value })}
                  required
                  value={meal.name ?? ''}
                />
              </label>
              <label>
                <span>{t(locale, 'meal.description')}</span>
                <textarea
                  onChange={(event) => updateMeal(index, { description: event.target.value })}
                  rows={3}
                  value={meal.description ?? ''}
                />
              </label>
              {meals.length > 1 ? (
                <button
                  className="text-button danger"
                  onClick={() => onChange(meals.filter((_, mealIndex) => mealIndex !== index))}
                  type="button"
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
