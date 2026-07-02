import { isMealDraftStarted, type MealDraft, type MealType } from '@project4/forms';
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

  function removeMeal(index: number) {
    const remainingMeals = meals.filter((_, mealIndex) => mealIndex !== index);
    onChange(remainingMeals.length ? remainingMeals : [createMeal()]);
  }

  return (
    <fieldset className="structured-fieldset meal-section">
      <legend>{t(locale, 'meal.sectionTitle')}</legend>
      <p className="field-help">{t(locale, 'meal.sectionHelp')}</p>
      {meals.map((meal, index) => (
        <div className="meal-card" key={meal.entryId ?? `new-${index}`}>
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
              {meals.length > 1 || isMealDraftStarted(meal) ? (
                <button
                  className="text-button danger"
                  onClick={() => removeMeal(index)}
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
