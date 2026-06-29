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
import { useEffect, useState } from 'react';

import { MealFields } from '../components/MealFields';
import { OtherFluidFields } from '../components/OtherFluidFields';
import { ScreenHeader } from '../components/ScreenHeader';

interface FoodFormScreenProps {
  client: AppSupabaseClient;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

function localDateValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function localTimeValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(11, 16);
}

function dayRange(day: string): { start: string; end: string; occurredAt: string } {
  const year = Number(day.split('-')[0]);
  const month = Number(day.split('-')[1]);
  const date = Number(day.split('-')[2]);
  const start = new Date(year, month - 1, date);
  const end = new Date(year, month - 1, date + 1);
  const occurredAt = new Date(year, month - 1, date, 12);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    occurredAt: occurredAt.toISOString(),
  };
}

function toLocalDateTime(value: Date): string {
  return `${localDateValue(value)} ${localTimeValue(value)}`;
}

function createEmptyMealDraft(): MealDraft {
  return { ...mealDraftDefaults, occurredAt: toLocalDateTime(new Date()) };
}

function createEmptyOtherFluidDraft(): OtherFluidDraft {
  return { occurredAt: toLocalDateTime(new Date()) };
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

function toValidLocalDateTime(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : toLocalDateTime(date);
}

function toOtherFluidDrafts(value: string | null | undefined): OtherFluidDraft[] {
  const parsedFluids = parseOtherFluids(value);
  if (!parsedFluids.length) return [createEmptyOtherFluidDraft()];

  return parsedFluids.map((fluid) => ({
    occurredAt: toValidLocalDateTime(fluid.occurredAt) ?? toLocalDateTime(new Date()),
    name: fluid.name ?? '',
  }));
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
  const day = localDateValue(new Date());
  const [hydration, setHydration] = useState<FoodHydrationDraft>({ ...foodHydrationDefaults });
  const [waterText, setWaterText] = useState('');
  const [meals, setMeals] = useState<MealDraft[]>([createEmptyMealDraft()]);
  const [otherFluids, setOtherFluids] = useState<OtherFluidDraft[]>([createEmptyOtherFluidDraft()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const range = dayRange(day);

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
      .catch(() => {
        if (active) setError(t(locale, 'food.loadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

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
      const range = dayRange(day);
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
    <main className="baseline-layout food-form-layout">
      <div className="baseline-toolbar">
        <ScreenHeader eyebrow={t(locale, 'role.patient')} title={t(locale, 'food.title')} />
        <p className="summary">{t(locale, 'food.subtitle')}</p>
        <button className="secondary-button" onClick={onBack} type="button">
          {t(locale, 'common.cancel')}
        </button>
      </div>

      <label className="tracked-day-field">
        <span>{t(locale, 'daily.trackedDay')}</span>
        <input readOnly type="text" value={day} />
      </label>

      {loading ? <p className="empty-state">{t(locale, 'app.loading')}</p> : null}
      {!loading ? (
        <form className="baseline-form food-form">
          <MealFields createMeal={createEmptyMealDraft} meals={meals} onChange={setMeals} />

          <fieldset className="full-width hydration-section">
            <legend>{t(locale, 'food.waterTitle')}</legend>
            <label>
              <span>{t(locale, 'food.waterAmountLiters')}</span>
              <input
                inputMode="decimal"
                onBlur={() => setWaterText((current) => normalizeWaterLitersText(current))}
                onChange={(event) => {
                  setWaterText(event.target.value);
                  setHydration((current) => ({
                    ...current,
                    waterLiters: parseWaterLitersInput(event.target.value),
                  }));
                }}
                placeholder="2.0"
                required
                value={waterText}
              />
            </label>
          </fieldset>

          <div className="full-width choice-field conditional-question">
            <span className="choice-label" id="other-fluids-label">
              {t(locale, 'food.otherFluids')}
            </span>
            <div aria-labelledby="other-fluids-label" className="choice-row" role="radiogroup">
              {([true, false] as const).map((answer) => (
                <button
                  aria-checked={hydration.hasOtherFluids === answer}
                  className={hydration.hasOtherFluids === answer ? 'selected' : ''}
                  key={String(answer)}
                  onClick={() =>
                    setHydration((current) => ({
                      ...current,
                      hasOtherFluids: answer,
                      otherFluids: answer ? current.otherFluids : '',
                    }))
                  }
                  role="radio"
                  type="button"
                >
                  {t(locale, answer ? 'common.yes' : 'common.no')}
                </button>
              ))}
            </div>
          </div>

          {hydration.hasOtherFluids ? (
            <OtherFluidFields
              createFluid={createEmptyOtherFluidDraft}
              fluids={otherFluids}
              onChange={setOtherFluids}
            />
          ) : null}

          <div className="full-width form-actions">
            {error ? <p className="notice error">{error}</p> : null}
            {message ? <p className="notice success">{message}</p> : null}
            <button
              className="primary-button"
              disabled={saving}
              onClick={() => void save()}
              type="button"
            >
              {t(locale, 'common.save')}
            </button>
          </div>
        </form>
      ) : null}
    </main>
  );
}
