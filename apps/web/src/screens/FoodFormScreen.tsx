import type { FoodFormDetails, UserProfile } from '@project4/contracts';
import {
  foodHydrationDefaults,
  getStartedMeals,
  mealDraftDefaults,
  normalizeFoodWaterLiters,
  parseOtherFluids,
  serializeOtherFluids,
  normalizeMealDateTime,
  validateOtherFluid,
  type FoodHydrationDraft,
} from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import {
  getPatientFoodForm,
  listPatientMeals,
  savePatientFoodForm,
  listPatientOtherFluids,
  listEntryPhotos,
  createEntryPhotoSignedUrl,
  deleteEntryPhotos,
  uploadPreparedEntryPhoto,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useEffect, useState } from 'react';

import { MealFields, type ClientMealDraft } from '../components/MealFields';
import { OtherFluidFields, type ClientOtherFluidDraft } from '../components/OtherFluidFields';
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

let localIdCounter = 0;
function generateLocalId() {
  return `local-${Date.now()}-${localIdCounter++}`;
}

function toLocalDateTime(value: Date): string {
  return `${localDateValue(value)} ${localTimeValue(value)}`;
}

function createEmptyMealDraft(): ClientMealDraft {
  return { localId: generateLocalId(), ...mealDraftDefaults, occurredAt: toLocalDateTime(new Date()) };
}

function createEmptyOtherFluidDraft(): ClientOtherFluidDraft {
  return { localId: generateLocalId(), occurredAt: toLocalDateTime(new Date()) };
}

function toHydrationDraft(details: FoodFormDetails | null): FoodHydrationDraft {
  if (!details) return { ...foodHydrationDefaults };
  const otherFluids = details.otherFluids?.trim() ?? '';
  return {
    waterLiters: details.waterLiters ?? undefined,
    hasOtherFluids: details.hasOtherFluids === true || otherFluids ? true : undefined,
    otherFluids: details.otherFluids ?? '',
  };
}

function toMealDrafts(records: Awaited<ReturnType<typeof listPatientMeals>>): ClientMealDraft[] {
  return records.length
    ? records.map((meal) => ({
        localId: generateLocalId(),
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

function toOtherFluidDrafts(
  records: Awaited<ReturnType<typeof listPatientOtherFluids>>,
  fallbackValue: string | null | undefined,
): ClientOtherFluidDraft[] {
  if (records.length) {
    return records.map((fluid) => ({
      localId: generateLocalId(),
      entryId: fluid.entryId ?? undefined,
      occurredAt: toValidLocalDateTime(fluid.occurredAt) ?? toLocalDateTime(new Date()),
      name: fluid.name ?? '',
    }));
  }

  const parsedFluids = parseOtherFluids(fallbackValue);
  if (!parsedFluids.length) return [createEmptyOtherFluidDraft()];

  return parsedFluids.map((fluid) => ({
    localId: generateLocalId(),
    entryId: fluid.entryId,
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

function createPhotoId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sameMinute(dateA: string, dateB: string | null | undefined): boolean {
  if (!dateB) return false;
  const a = new Date(dateA);
  const b = new Date(dateB);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate() &&
    a.getHours() === b.getHours() &&
    a.getMinutes() === b.getMinutes()
  );
}

async function withMealPhotoUris(
  client: AppSupabaseClient,
  mealDrafts: ClientMealDraft[],
): Promise<ClientMealDraft[]> {
  return Promise.all(
    mealDrafts.map(async (meal) => {
      if (!meal.entryId) return meal;
      const photos = await listEntryPhotos(client, meal.entryId);
      const existingPhotoUris = await Promise.all(
        photos
          .filter((photo) => photo.contextType === 'meal' || photo.contextType === null)
          .map((photo) => createEntryPhotoSignedUrl(client, photo.thumbnailPath)),
      );
      return { ...meal, existingPhotoUris };
    }),
  );
}

async function withFluidPhotoUris(
  client: AppSupabaseClient,
  foodEntryId: string | null,
  fluidDrafts: ClientOtherFluidDraft[],
): Promise<ClientOtherFluidDraft[]> {
  const fluidsWithEntryPhotos = await Promise.all(
    fluidDrafts.map(async (fluid) => {
      if (!fluid.entryId) return fluid;
      const photos = await listEntryPhotos(client, fluid.entryId);
      const existingPhotoUris = await Promise.all(
        photos
          .filter((photo) => photo.contextType === 'fluid' || photo.contextType === null)
          .map((photo) => createEntryPhotoSignedUrl(client, photo.thumbnailPath)),
      );
      return { ...fluid, existingPhotoUris };
    }),
  );

  if (!foodEntryId) return fluidsWithEntryPhotos;

  const photos = (await listEntryPhotos(client, foodEntryId)).filter(
    (photo) => photo.contextType === 'fluid',
  );
  if (!photos.length) return fluidsWithEntryPhotos;

  const photosWithUris = await Promise.all(
    photos.map(async (photo) => ({
      label: photo.contextLabel?.trim(),
      uri: await createEntryPhotoSignedUrl(client, photo.thumbnailPath),
    })),
  );

  const matchedUris = new Set<string>();
  const fluidsWithMatchedPhotos = fluidsWithEntryPhotos.map((fluid) => {
    const label = fluid.name?.trim();
    const existingPhotoUris = label
      ? photosWithUris
          .filter((photo) => photo.label === label)
          .map((photo) => {
            matchedUris.add(photo.uri);
            return photo.uri;
          })
      : [];
    return { ...fluid, existingPhotoUris };
  });

  const unmatchedUris = photosWithUris
    .filter((photo) => !matchedUris.has(photo.uri))
    .map((photo) => photo.uri);

  if (!unmatchedUris.length) return fluidsWithMatchedPhotos;

  return fluidsWithMatchedPhotos.map((fluid, index) => {
    if (index === 0) {
      return {
        ...fluid,
        existingPhotoUris: [...(fluid.existingPhotoUris ?? []), ...unmatchedUris],
      };
    }
    return fluid;
  });
}

export function FoodFormScreen({ client, onBack, onSaved, profile }: FoodFormScreenProps) {
  const locale = DEFAULT_LOCALE;
  const day = localDateValue(new Date());
  const [hydration, setHydration] = useState<FoodHydrationDraft>({ ...foodHydrationDefaults });
  const [waterText, setWaterText] = useState('');
  const [meals, setMeals] = useState<ClientMealDraft[]>([createEmptyMealDraft()]);
  const [otherFluids, setOtherFluids] = useState<ClientOtherFluidDraft[]>([createEmptyOtherFluidDraft()]);
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
      .then(async ([foodRecord, mealRecords]) => {
        if (!active) return;
        const nextHydration = toHydrationDraft(foodRecord?.details ?? null);
        const foodEntryId = foodRecord?.entryId ?? null;
        const fluidRecords = foodEntryId ? await listPatientOtherFluids(client, foodEntryId) : [];

        setHydration(nextHydration);
        setWaterText(formatWaterLiters(nextHydration.waterLiters));

        const baseMeals = toMealDrafts(mealRecords);
        const baseOtherFluids = toOtherFluidDrafts(fluidRecords, nextHydration.otherFluids);

        const [mealsWithPhotos, fluidsWithPhotos] = await Promise.all([
          withMealPhotoUris(client, baseMeals),
          withFluidPhotoUris(client, foodEntryId, baseOtherFluids),
        ]);

        setMeals(mealsWithPhotos);
        setOtherFluids(fluidsWithPhotos);
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
    const mealsToSave = meals.filter(
      (meal) => meal.localPhoto || getStartedMeals([meal]).length > 0,
    );
    const fluidsToSave = otherFluids.filter(
      (fluid) => fluid.entryId || fluid.localPhoto || validateOtherFluid(fluid),
    );
    const normalizedWaterText = normalizeWaterLitersText(waterText);
    const parsedWaterLiters = parseWaterLitersInput(normalizedWaterText);
    const normalizedHydration: FoodHydrationDraft = {
      ...hydration,
      waterLiters: parsedWaterLiters,
      hasOtherFluids: hydration.hasOtherFluids,
      otherFluids: hydration.hasOtherFluids === true && fluidsToSave.length > 0
        ? serializeOtherFluids(fluidsToSave)
        : undefined,
    };

    setWaterText(normalizedWaterText);
    setHydration(normalizedHydration);

    if (
      Number.isNaN(parsedWaterLiters) ||
      !mealsToSave.every((meal) => normalizeMealDateTime(meal.occurredAt)) ||
      !fluidsToSave.every((fluid) => normalizeMealDateTime(fluid.occurredAt))
    ) {
      setError(t(locale, 'food.requiredError'));
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const range = dayRange(day);
      await savePatientFoodForm(client, range, normalizedHydration, mealsToSave);

      const [foodRecord, mealRecords] = await Promise.all([
        getPatientFoodForm(client, profile.id, range.start, range.end),
        listPatientMeals(client, profile.id, range.start, range.end),
      ]);
      const foodEntryId = foodRecord?.entryId ?? null;
      const fluidRecords = foodEntryId ? await listPatientOtherFluids(client, foodEntryId) : [];

      // Clean up legacy photo records if other fluids were disabled
      if (hydration.hasOtherFluids !== true && foodEntryId) {
        const legacyFluidPhotos = (await listEntryPhotos(client, foodEntryId)).filter(
          (photo) => photo.contextType === 'fluid',
        );
        await deleteEntryPhotos(client, legacyFluidPhotos);
      }

      // Handle meal photo uploads
      for (let i = 0; i < meals.length; i++) {
        const mealDraft = meals[i];
        if (mealDraft && mealDraft.localPhoto) {
          const normalizedMealTime = normalizeMealDateTime(mealDraft.occurredAt);
          const savedMeal = mealRecords.find(
            (record) =>
              record.entryId === mealDraft.entryId ||
              (
                sameMinute(record.occurredAt, normalizedMealTime) &&
                record.type === (mealDraft.type ?? null) &&
                (record.name?.trim() ?? null) === (mealDraft.name?.trim() || null)
              ),
          );
          if (!savedMeal?.entryId) {
            throw new Error('Saved meal could not be matched for photo upload.');
          }

          const photoId = createPhotoId();
          await uploadPreparedEntryPhoto(client, {
            contextLabel: savedMeal.name || undefined,
            contextType: 'meal',
            entryId: savedMeal.entryId,
            patientId: profile.id,
            photoId,
            photoBody: mealDraft.localPhoto.photoBody,
            thumbnailBody: mealDraft.localPhoto.thumbnailBody,
            metadata: mealDraft.localPhoto.metadata,
          });
        }
      }

      // Handle fluid photo uploads
      for (let i = 0; i < otherFluids.length; i++) {
        const fluidDraft = otherFluids[i];
        if (fluidDraft && fluidDraft.localPhoto) {
          const normalizedFluidTime = normalizeMealDateTime(fluidDraft.occurredAt);
          const savedFluid = fluidRecords.find(
            (record) =>
              record.entryId === fluidDraft.entryId ||
              (
                sameMinute(record.occurredAt, normalizedFluidTime) &&
                (record.name?.trim() ?? null) === (fluidDraft.name?.trim() || null)
              ),
          );
          if (!savedFluid?.entryId) {
            throw new Error('Saved fluid could not be matched for photo upload.');
          }

          const photoId = createPhotoId();
          await uploadPreparedEntryPhoto(client, {
            contextLabel: fluidDraft.name?.trim() || 'Fluid photo',
            contextType: 'fluid',
            entryId: savedFluid.entryId,
            patientId: profile.id,
            photoId,
            photoBody: fluidDraft.localPhoto.photoBody,
            thumbnailBody: fluidDraft.localPhoto.thumbnailBody,
            metadata: fluidDraft.localPhoto.metadata,
          });
        }
      }

      // Re-fetch and update state with saved record & URLs
      const [updatedFoodRecord, updatedMealRecords] = await Promise.all([
        getPatientFoodForm(client, profile.id, range.start, range.end),
        listPatientMeals(client, profile.id, range.start, range.end),
      ]);
      const finalHydration = toHydrationDraft(updatedFoodRecord?.details ?? null);
      const finalFoodEntryId = updatedFoodRecord?.entryId ?? null;
      const finalFluidRecords = finalFoodEntryId ? await listPatientOtherFluids(client, finalFoodEntryId) : [];

      setHydration(finalHydration);
      setWaterText(formatWaterLiters(finalHydration.waterLiters));

      const finalBaseMeals = toMealDrafts(updatedMealRecords);
      const finalBaseOtherFluids = toOtherFluidDrafts(finalFluidRecords, finalHydration.otherFluids);

      const [finalMealsWithPhotos, finalFluidsWithPhotos] = await Promise.all([
        withMealPhotoUris(client, finalBaseMeals),
        withFluidPhotoUris(client, finalFoodEntryId, finalBaseOtherFluids),
      ]);

      setMeals(finalMealsWithPhotos);
      setOtherFluids(finalFluidsWithPhotos);
      setMessage(t(locale, 'food.saved'));
      onSaved();
    } catch {
      setError(t(locale, 'food.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="baseline-layout structured-entry-layout food-form-layout">
      <div className="baseline-toolbar">
        <ScreenHeader eyebrow={t(locale, 'role.patient')} title={t(locale, 'food.title')} />
        <p className="summary">{t(locale, 'food.subtitle')}</p>
      </div>

      {loading ? <p className="empty-state">{t(locale, 'app.loading')}</p> : null}
      {!loading ? (
        <form className="structured-entry-form food-form">
          <MealFields createMeal={createEmptyMealDraft} meals={meals} onChange={setMeals} />

          <fieldset className="structured-fieldset hydration-section">
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

          <fieldset className="structured-fieldset conditional-question">
            <legend>{t(locale, 'food.otherFluids')}</legend>
            <div className="choice-row" role="radiogroup">
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
          </fieldset>

          {hydration.hasOtherFluids ? (
            <OtherFluidFields
              createFluid={createEmptyOtherFluidDraft}
              fluids={otherFluids}
              onChange={setOtherFluids}
            />
          ) : null}

          <div className="form-actions form-actions-row">
            {error ? <p className="notice error">{error}</p> : null}
            {message ? <p className="notice success">{message}</p> : null}
            <button className="secondary-button" onClick={onBack} type="button">
              {t(locale, 'common.cancel')}
            </button>
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
