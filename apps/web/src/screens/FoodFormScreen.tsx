import type { FoodFormDetails, UserProfile } from '@project4/contracts';
import {
  researchCalendarDay,
  researchCalendarDayRange,
  researchCalendarTime,
} from '@project4/contracts';
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
import { getActiveLocale, t } from '@project4/i18n';
import {
  createStagedEntryPhotoDeletions,
  filterStagedEntryPhotos,
  mergeExistingPhotosByEntryId,
  stageEntryPhotoDeletions,
  stageRemovedDraftEntryPhotos,
} from '@project4/photo';
import {
  getPatientFoodForm,
  listPatientMeals,
  savePatientFoodForm,
  listPatientOtherFluids,
  listEntryPhotos,
  createEntryPhotoSignedUrl,
  deleteQueuedEntryPhotos,
  drainPendingPatientPhotoCleanups,
  uploadPreparedEntryPhoto,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useEffect, useRef, useState } from 'react';

import { MealFields, type ClientMealDraft } from '../components/MealFields';
import { OtherFluidFields, type ClientOtherFluidDraft } from '../components/OtherFluidFields';
import type { ExistingWebPhoto } from '../components/PhotoUploader';
import { ScreenHeader } from '../components/ScreenHeader';
import { loadPendingPhotoDeletions, savePendingPhotoDeletions } from '../offline/pendingEntries';
import { StatusMessage } from '../components/StatusMessage';
import type { StructuredFormExitReason } from './structuredFormDiscard';

interface FoodFormScreenProps {
  client: AppSupabaseClient;
  onBack: (reason?: StructuredFormExitReason) => void;
  onSaved: () => void;
  profile: UserProfile;
}

interface FoodPhotoLoadInput {
  foodEntryId: string | null;
  meals: ClientMealDraft[];
  otherFluids: ClientOtherFluidDraft[];
}

function localDateValue(date: Date): string {
  return researchCalendarDay(date);
}

function localTimeValue(date: Date): string {
  return researchCalendarTime(date);
}

function dayRange(day: string): { start: string; end: string; occurredAt: string } {
  return researchCalendarDayRange(day);
}

let localIdCounter = 0;
function generateLocalId() {
  return `local-${Date.now()}-${localIdCounter++}`;
}

function toLocalDateTime(value: Date): string {
  return `${localDateValue(value)} ${localTimeValue(value)}`;
}

function createEmptyMealDraft(): ClientMealDraft {
  return {
    localId: generateLocalId(),
    ...mealDraftDefaults,
    occurredAt: toLocalDateTime(new Date()),
  };
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
      const existingPhotos: ExistingWebPhoto[] = await Promise.all(
        photos
          .filter((photo) => photo.contextType === 'meal' || photo.contextType === null)
          .map(async (photo) => ({
            id: photo.id,
            photoPath: photo.photoPath,
            thumbnailPath: photo.thumbnailPath,
            uri: await createEntryPhotoSignedUrl(client, photo.thumbnailPath),
          })),
      );
      return { ...meal, existingPhotos };
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
      const existingPhotos: ExistingWebPhoto[] = await Promise.all(
        photos
          .filter((photo) => photo.contextType === 'fluid' || photo.contextType === null)
          .map(async (photo) => ({
            id: photo.id,
            photoPath: photo.photoPath,
            thumbnailPath: photo.thumbnailPath,
            uri: await createEntryPhotoSignedUrl(client, photo.thumbnailPath),
          })),
      );
      return { ...fluid, existingPhotos };
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
      id: photo.id,
      photoPath: photo.photoPath,
      thumbnailPath: photo.thumbnailPath,
      uri: await createEntryPhotoSignedUrl(client, photo.thumbnailPath),
    })),
  );

  const matchedPhotoIds = new Set<string>();
  const fluidsWithMatchedPhotos = fluidsWithEntryPhotos.map((fluid) => {
    const label = fluid.name?.trim();
    const existingPhotos = label
      ? photosWithUris
          .filter((photo) => photo.label === label)
          .map((photo) => {
            matchedPhotoIds.add(photo.id);
            return photo;
          })
      : [];
    return { ...fluid, existingPhotos };
  });

  const unmatchedPhotos = photosWithUris.filter((photo) => !matchedPhotoIds.has(photo.id));

  if (!unmatchedPhotos.length) return fluidsWithMatchedPhotos;

  return fluidsWithMatchedPhotos.map((fluid, index) => {
    if (index === 0) {
      return {
        ...fluid,
        existingPhotos: [...(fluid.existingPhotos ?? []), ...unmatchedPhotos],
      };
    }
    return fluid;
  });
}

export function FoodFormScreen({ client, onBack, onSaved, profile }: FoodFormScreenProps) {
  const locale = getActiveLocale();
  const day = localDateValue(new Date());
  const [hydration, setHydration] = useState<FoodHydrationDraft>({ ...foodHydrationDefaults });
  const [waterText, setWaterText] = useState('');
  const [meals, setMeals] = useState<ClientMealDraft[]>([createEmptyMealDraft()]);
  const [otherFluids, setOtherFluids] = useState<ClientOtherFluidDraft[]>([
    createEmptyOtherFluidDraft(),
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [photoLoadInput, setPhotoLoadInput] = useState<FoodPhotoLoadInput | null>(null);
  const [photoLoadAttempt, setPhotoLoadAttempt] = useState(0);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const completedPhotoUploadIdsRef = useRef(new Set<string>());
  const mealsRef = useRef(meals);
  const otherFluidsRef = useRef(otherFluids);
  const stagedPhotoDeletionsRef = useRef(createStagedEntryPhotoDeletions());

  function replaceMeals(nextMeals: ClientMealDraft[]) {
    stagedPhotoDeletionsRef.current = stageRemovedDraftEntryPhotos(
      stagedPhotoDeletionsRef.current,
      mealsRef.current,
      nextMeals,
    );
    mealsRef.current = nextMeals;
    setMeals(nextMeals);
  }

  function replaceOtherFluids(nextFluids: ClientOtherFluidDraft[]) {
    stagedPhotoDeletionsRef.current = stageRemovedDraftEntryPhotos(
      stagedPhotoDeletionsRef.current,
      otherFluidsRef.current,
      nextFluids,
    );
    otherFluidsRef.current = nextFluids;
    setOtherFluids(nextFluids);
  }

  async function resolveStagedPhotoDeletions() {
    const photos = (
      await Promise.all(
        stagedPhotoDeletionsRef.current.entryIds.map((entryId) => listEntryPhotos(client, entryId)),
      )
    ).flat();
    stagedPhotoDeletionsRef.current = stageEntryPhotoDeletions(
      stagedPhotoDeletionsRef.current,
      photos,
    );
  }

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
        const baseMeals = toMealDrafts(mealRecords);
        const baseOtherFluids = toOtherFluidDrafts(fluidRecords, nextHydration.otherFluids);

        setHydration(nextHydration);
        setWaterText(formatWaterLiters(nextHydration.waterLiters));
        mealsRef.current = baseMeals;
        otherFluidsRef.current = baseOtherFluids;
        setMeals(baseMeals);
        setOtherFluids(baseOtherFluids);
        setPhotoLoadInput({ foodEntryId, meals: baseMeals, otherFluids: baseOtherFluids });
      })
      .catch(() => {
        if (active) {
          setLoadFailed(true);
          setError(t(locale, 'food.loadError'));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client, day, loadAttempt, locale, profile.id]);

  useEffect(() => {
    if (!photoLoadInput) return;
    let active = true;
    void Promise.all([
      withMealPhotoUris(client, photoLoadInput.meals),
      withFluidPhotoUris(client, photoLoadInput.foodEntryId, photoLoadInput.otherFluids),
    ])
      .then(([mealsWithPhotos, fluidsWithPhotos]) => {
        if (!active) return;
        setMeals((current) => {
          const next = mergeExistingPhotosByEntryId(current, mealsWithPhotos).map((draft) => ({
            ...draft,
            existingPhotos: filterStagedEntryPhotos(
              draft.existingPhotos ?? [],
              stagedPhotoDeletionsRef.current,
            ),
          }));
          mealsRef.current = next;
          return next;
        });
        setOtherFluids((current) => {
          const next = mergeExistingPhotosByEntryId(current, fluidsWithPhotos).map((draft) => ({
            ...draft,
            existingPhotos: filterStagedEntryPhotos(
              draft.existingPhotos ?? [],
              stagedPhotoDeletionsRef.current,
            ),
          }));
          otherFluidsRef.current = next;
          return next;
        });
        setPhotoLoadFailed(false);
      })
      .catch(() => {
        if (active) setPhotoLoadFailed(true);
      })
      .finally(() => {
        if (active) setPhotoLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client, photoLoadAttempt, photoLoadInput]);

  async function deleteMealPhoto(localId: string, photo: ExistingWebPhoto) {
    replaceMeals(
      mealsRef.current.map((meal) =>
        (meal.localId ?? meal.entryId) === localId
          ? {
              ...meal,
              existingPhotos: meal.existingPhotos?.filter((candidate) => candidate.id !== photo.id),
            }
          : meal,
      ),
    );
  }

  async function deleteFluidPhoto(localId: string, photo: ExistingWebPhoto) {
    replaceOtherFluids(
      otherFluidsRef.current.map((fluid) =>
        (fluid.localId ?? fluid.entryId) === localId
          ? {
              ...fluid,
              existingPhotos: fluid.existingPhotos?.filter(
                (candidate) => candidate.id !== photo.id,
              ),
            }
          : fluid,
      ),
    );
  }

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
      otherFluids:
        hydration.hasOtherFluids === true && fluidsToSave.length > 0
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
      const pendingPhotoDeletions = loadPendingPhotoDeletions(profile.id);
      if (pendingPhotoDeletions.length) {
        await deleteQueuedEntryPhotos(client, pendingPhotoDeletions);
        try {
          savePendingPhotoDeletions(profile.id, []);
        } catch {
          // Cleanup is idempotent; a stale queue can safely retry later.
        }
      }
      if (normalizedHydration.hasOtherFluids !== true) {
        stagedPhotoDeletionsRef.current = stageRemovedDraftEntryPhotos(
          stagedPhotoDeletionsRef.current,
          otherFluidsRef.current,
          [],
        );
        const legacyFoodEntryId = photoLoadInput?.foodEntryId;
        if (legacyFoodEntryId) {
          const legacyFluidPhotos = (await listEntryPhotos(client, legacyFoodEntryId)).filter(
            (photo) => photo.contextType === 'fluid',
          );
          stagedPhotoDeletionsRef.current = stageEntryPhotoDeletions(
            stagedPhotoDeletionsRef.current,
            legacyFluidPhotos,
          );
        }
      }
      await resolveStagedPhotoDeletions();
      const range = dayRange(day);
      await savePatientFoodForm(
        client,
        range,
        normalizedHydration,
        mealsToSave,
        stagedPhotoDeletionsRef.current.photos.map((photo) => photo.id),
      );

      const [foodRecord, mealRecords] = await Promise.all([
        getPatientFoodForm(client, profile.id, range.start, range.end),
        listPatientMeals(client, profile.id, range.start, range.end),
      ]);
      const foodEntryId = foodRecord?.entryId ?? null;
      const fluidRecords = foodEntryId ? await listPatientOtherFluids(client, foodEntryId) : [];

      // Retain the database identities immediately. If a later photo fails, the
      // next save updates these records instead of replacing their entries.
      const mealsWithEntryIds = mealsRef.current.map((mealDraft) => {
        const normalizedMealTime = normalizeMealDateTime(mealDraft.occurredAt);
        const savedMeal = mealRecords.find(
          (record) =>
            record.entryId === mealDraft.entryId ||
            (sameMinute(record.occurredAt, normalizedMealTime) &&
              record.type === (mealDraft.type ?? null) &&
              (record.name?.trim() ?? null) === (mealDraft.name?.trim() || null)),
        );
        return savedMeal?.entryId ? { ...mealDraft, entryId: savedMeal.entryId } : mealDraft;
      });
      mealsRef.current = mealsWithEntryIds;
      setMeals(mealsWithEntryIds);
      const fluidsWithEntryIds = otherFluidsRef.current.map((fluidDraft) => {
        const normalizedFluidTime = normalizeMealDateTime(fluidDraft.occurredAt);
        const savedFluid = fluidRecords.find(
          (record) =>
            record.entryId === fluidDraft.entryId ||
            (sameMinute(record.occurredAt, normalizedFluidTime) &&
              (record.name?.trim() ?? null) === (fluidDraft.name?.trim() || null)),
        );
        return savedFluid?.entryId
          ? { ...fluidDraft, entryId: savedFluid.entryId ?? undefined }
          : fluidDraft;
      });
      otherFluidsRef.current = fluidsWithEntryIds;
      setOtherFluids(fluidsWithEntryIds);

      // Handle meal photo uploads
      for (let i = 0; i < meals.length; i++) {
        const mealDraft = meals[i];
        if (mealDraft && mealDraft.localPhoto) {
          if (completedPhotoUploadIdsRef.current.has(mealDraft.localPhoto.uploadId)) {
            continue;
          }
          const normalizedMealTime = normalizeMealDateTime(mealDraft.occurredAt);
          const savedMeal = mealRecords.find(
            (record) =>
              record.entryId === mealDraft.entryId ||
              (sameMinute(record.occurredAt, normalizedMealTime) &&
                record.type === (mealDraft.type ?? null) &&
                (record.name?.trim() ?? null) === (mealDraft.name?.trim() || null)),
          );
          if (!savedMeal?.entryId) {
            throw new Error('Saved meal could not be matched for photo upload.');
          }

          const photoId = mealDraft.localPhoto.uploadId;
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
          completedPhotoUploadIdsRef.current.add(photoId);
        }
      }

      // Handle fluid photo uploads
      for (let i = 0; i < otherFluids.length; i++) {
        const fluidDraft = otherFluids[i];
        if (fluidDraft && fluidDraft.localPhoto) {
          if (completedPhotoUploadIdsRef.current.has(fluidDraft.localPhoto.uploadId)) {
            continue;
          }
          const normalizedFluidTime = normalizeMealDateTime(fluidDraft.occurredAt);
          const savedFluid = fluidRecords.find(
            (record) =>
              record.entryId === fluidDraft.entryId ||
              (sameMinute(record.occurredAt, normalizedFluidTime) &&
                (record.name?.trim() ?? null) === (fluidDraft.name?.trim() || null)),
          );
          if (!savedFluid?.entryId) {
            throw new Error('Saved fluid could not be matched for photo upload.');
          }

          const photoId = fluidDraft.localPhoto.uploadId;
          await uploadPreparedEntryPhoto(client, {
            contextLabel: fluidDraft.name?.trim() || t(locale, 'photo.context.fluid'),
            contextType: 'fluid',
            entryId: savedFluid.entryId,
            patientId: profile.id,
            photoId,
            photoBody: fluidDraft.localPhoto.photoBody,
            thumbnailBody: fluidDraft.localPhoto.thumbnailBody,
            metadata: fluidDraft.localPhoto.metadata,
          });
          completedPhotoUploadIdsRef.current.add(photoId);
        }
      }

      await drainPendingPatientPhotoCleanups(client);
      stagedPhotoDeletionsRef.current = createStagedEntryPhotoDeletions();

      // Re-fetch required medical data; optional photos are enriched independently.
      const [updatedFoodRecord, updatedMealRecords] = await Promise.all([
        getPatientFoodForm(client, profile.id, range.start, range.end),
        listPatientMeals(client, profile.id, range.start, range.end),
      ]);
      const finalHydration = toHydrationDraft(updatedFoodRecord?.details ?? null);
      const finalFoodEntryId = updatedFoodRecord?.entryId ?? null;
      const finalFluidRecords = finalFoodEntryId
        ? await listPatientOtherFluids(client, finalFoodEntryId)
        : [];

      setHydration(finalHydration);
      setWaterText(formatWaterLiters(finalHydration.waterLiters));
      const finalBaseMeals = toMealDrafts(updatedMealRecords);
      const finalBaseOtherFluids = toOtherFluidDrafts(
        finalFluidRecords,
        finalHydration.otherFluids,
      );
      mealsRef.current = finalBaseMeals;
      otherFluidsRef.current = finalBaseOtherFluids;
      setMeals(finalBaseMeals);
      setOtherFluids(finalBaseOtherFluids);
      setPhotoLoadFailed(false);
      setPhotoLoadInput({
        foodEntryId: finalFoodEntryId,
        meals: finalBaseMeals,
        otherFluids: finalBaseOtherFluids,
      });
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
      {!loading && loadFailed ? (
        <section className="structured-entry-form">
          <StatusMessage tone="error">{error ?? t(locale, 'food.loadError')}</StatusMessage>
          <div className="form-actions form-actions-row">
            <button
              className="primary-button"
              onClick={() => {
                setLoading(true);
                setLoadFailed(false);
                setError(null);
                setMessage(null);
                setPhotoLoadInput(null);
                setPhotoLoadFailed(false);
                setLoadAttempt((current) => current + 1);
              }}
              type="button"
            >
              {t(locale, 'common.retry')}
            </button>
            <button
              className="secondary-button"
              onClick={() => onBack('load-failed')}
              type="button"
            >
              {t(locale, 'common.back')}
            </button>
          </div>
        </section>
      ) : null}
      {!loading && !loadFailed ? (
        <form className="structured-entry-form food-form">
          <MealFields
            createMeal={createEmptyMealDraft}
            meals={meals}
            onChange={replaceMeals}
            onDeletePhoto={deleteMealPhoto}
          />

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
              onChange={replaceOtherFluids}
              onDeletePhoto={deleteFluidPhoto}
            />
          ) : null}

          {photoLoadFailed ? (
            <div className="form-actions form-actions-row">
              <StatusMessage tone="error">{t(locale, 'photo.loadError')}</StatusMessage>
              <button
                className="secondary-button"
                disabled={photoLoading}
                onClick={() => {
                  setPhotoLoading(true);
                  setPhotoLoadAttempt((current) => current + 1);
                }}
                type="button"
              >
                {photoLoading ? t(locale, 'app.loading') : t(locale, 'common.retry')}
              </button>
            </div>
          ) : null}

          <div className="form-actions form-actions-row">
            {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
            {message ? <StatusMessage tone="success">{message}</StatusMessage> : null}
            <button
              className="secondary-button"
              disabled={saving}
              onClick={() => onBack()}
              type="button"
            >
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
