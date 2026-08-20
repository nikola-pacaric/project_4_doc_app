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
  type MealDraft,
  type OtherFluidDraft,
} from '@project4/forms';
import { getActiveLocale, t } from '@project4/i18n';
import {
  createStagedEntryPhotoDeletions,
  filterStagedEntryPhotos,
  mergeExistingPhotosByEntryId,
  PHOTO_MIME_TYPE,
  stageEntryPhotoDeletions,
  stageRemovedDraftEntryPhotos,
} from '@project4/photo';
import {
  deleteQueuedEntryPhotos,
  drainPendingPatientPhotoCleanups,
  getPatientFoodForm,
  listEntryPhotos,
  listPatientOtherFluids,
  listPatientMeals,
  savePatientFoodForm,
  uploadPreparedEntryPhoto,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { FormField } from '../components/FormField';
import { fluidPhotoContextLabel } from '../lib/photoContextLabel';
import { loadPendingPhotoDeletions, savePendingPhotoDeletions } from '../offline/pendingEntries';
import { cleanupPreparedPhoto } from '../lib/preparedPhotos';
import { type PersistedEntryPhoto, withSignedThumbnailUris } from '../lib/persistedPhotos';
import { MealFields, type ClientMealDraft } from '../components/MealFields';
import { OtherFluidFields, type ClientOtherFluidDraft } from '../components/OtherFluidFields';
import { PrimaryButton } from '../components/PrimaryButton';
import { TactileChoiceRow } from '../components/TactileChoiceRow';
import { TactileFormShell } from '../components/TactileFormShell';
import { useTactileFormPalette } from '../components/tactileFormPalette';
import { TactileSectionCard } from '../components/TactileSectionCard';
import { tactileFieldLabelStyle, tactilePillInputStyle } from '../theme/tactileForm';
import { localDayRange, toLocalDateInput, toLocalTimeInput } from '../utils/dateTime';
import { PhotoUploadScreen, type PreparedPhoto } from './PhotoUploadScreen';

interface FoodFormScreenProps {
  client: AppSupabaseClient;
  onBack: () => void;
  onCancelProfile?: () => void;
  onCancelTimeline?: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

interface FoodPhotoLoadInput {
  foodEntryId: string | null;
  meals: ClientMealDraft[];
  otherFluids: ClientOtherFluidDraft[];
}

function localPreparedPhotos(drafts: { localPhoto?: PreparedPhoto | null }[]): PreparedPhoto[] {
  const photos = drafts.flatMap((draft) => (draft.localPhoto ? [draft.localPhoto] : []));
  return [...new Map(photos.map((photo) => [photo.uploadId, photo])).values()];
}

async function cleanupPreparedPhotos(photos: PreparedPhoto[]): Promise<void> {
  await Promise.all(photos.map((photo) => cleanupPreparedPhoto(photo)));
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

async function withMealPhotos(
  client: AppSupabaseClient,
  mealDrafts: ClientMealDraft[],
): Promise<ClientMealDraft[]> {
  return Promise.all(
    mealDrafts.map(async (meal) => {
      if (!meal.entryId) return meal;
      const photos = (await listEntryPhotos(client, meal.entryId)).filter(
        (photo) => photo.contextType === 'meal' || photo.contextType === null,
      );
      return { ...meal, existingPhotos: await withSignedThumbnailUris(client, photos) };
    }),
  );
}

async function withFluidPhotos(
  client: AppSupabaseClient,
  foodEntryId: string | null,
  fluidDrafts: ClientOtherFluidDraft[],
): Promise<ClientOtherFluidDraft[]> {
  const fluidsWithEntryPhotos = await Promise.all(
    fluidDrafts.map(async (fluid) => {
      if (!fluid.entryId) return fluid;
      const photos = (await listEntryPhotos(client, fluid.entryId)).filter(
        (photo) => photo.contextType === 'fluid' || photo.contextType === null,
      );
      return { ...fluid, existingPhotos: await withSignedThumbnailUris(client, photos) };
    }),
  );

  if (!foodEntryId) return fluidsWithEntryPhotos;

  const photos = (await listEntryPhotos(client, foodEntryId)).filter(
    (photo) => photo.contextType === 'fluid',
  );
  if (!photos.length) return fluidsWithEntryPhotos;

  const persistedPhotos = await withSignedThumbnailUris(client, photos);
  const photosWithLabels = photos.map((photo, index) => ({
    label: photo.contextLabel?.trim(),
    photo: persistedPhotos[index]!,
  }));
  const matchedIds = new Set<string>();
  const fluidsWithMatchedPhotos = fluidsWithEntryPhotos.map((fluid) => {
    const label = fluid.name?.trim();
    const existingPhotos = label
      ? photosWithLabels
          .filter((item) => item.label === label)
          .map((item) => {
            matchedIds.add(item.photo.id);
            return item.photo;
          })
      : [];
    return { ...fluid, existingPhotos };
  });
  const unmatchedPhotos = photosWithLabels
    .filter((item) => !matchedIds.has(item.photo.id))
    .map((item) => item.photo);

  if (!unmatchedPhotos.length) return fluidsWithMatchedPhotos;
  return fluidsWithMatchedPhotos.map((fluid, index) =>
    index === 0
      ? { ...fluid, existingPhotos: [...(fluid.existingPhotos ?? []), ...unmatchedPhotos] }
      : fluid,
  );
}

function toLocalDateTime(value: Date): string {
  return `${toLocalDateInput(value)} ${toLocalTimeInput(value)}`;
}

function sameMinute(left: string | null | undefined, right: string | null | undefined): boolean {
  if (!left || !right) return false;
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return false;
  return Math.floor(leftTime / 60_000) === Math.floor(rightTime / 60_000);
}

function createEmptyMealDraft(): MealDraft {
  return { ...mealDraftDefaults, occurredAt: toLocalDateTime(new Date()) };
}

function createEmptyOtherFluidDraft(): OtherFluidDraft {
  return { occurredAt: toLocalDateTime(new Date()) };
}

function toValidLocalDateTime(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : toLocalDateTime(date);
}

function toOtherFluidDrafts(
  records: Awaited<ReturnType<typeof listPatientOtherFluids>>,
  fallbackValue: string | null | undefined,
): OtherFluidDraft[] {
  if (records.length) {
    return records.map((fluid) => ({
      entryId: fluid.entryId ?? undefined,
      occurredAt: toValidLocalDateTime(fluid.occurredAt) ?? toLocalDateTime(new Date()),
      name: fluid.name ?? '',
    }));
  }

  const parsedFluids = parseOtherFluids(fallbackValue);
  if (!parsedFluids.length) return [createEmptyOtherFluidDraft()];

  return parsedFluids.map((fluid) => {
    return {
      entryId: fluid.entryId,
      occurredAt: toValidLocalDateTime(fluid.occurredAt) ?? toLocalDateTime(new Date()),
      name: fluid.name ?? '',
    };
  });
}

interface FoodPhotoTarget {
  contextLabel: string;
  contextType: 'meal' | 'fluid';
  index: number;
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

export function FoodFormScreen({
  client,
  onBack,
  onCancelProfile,
  onCancelTimeline,
  onSaved,
  profile,
}: FoodFormScreenProps) {
  const locale = getActiveLocale();
  const palette = useTactileFormPalette();
  const pill = tactilePillInputStyle(palette);
  const label = tactileFieldLabelStyle(palette);
  const today = toLocalDateInput(new Date());
  const day = today;
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
  const [photoTarget, setPhotoTarget] = useState<FoodPhotoTarget | null>(null);
  const mealsRef = useRef(meals);
  const otherFluidsRef = useRef(otherFluids);
  const uploadedPhotoIdsRef = useRef(new Set<string>());
  const stagedPhotoDeletionsRef = useRef(createStagedEntryPhotoDeletions());

  useEffect(
    () => () => {
      void cleanupPreparedPhotos([
        ...localPreparedPhotos(mealsRef.current),
        ...localPreparedPhotos(otherFluidsRef.current),
      ]);
    },
    [],
  );

  function replaceMeals(nextMeals: ClientMealDraft[]) {
    stagedPhotoDeletionsRef.current = stageRemovedDraftEntryPhotos(
      stagedPhotoDeletionsRef.current,
      mealsRef.current,
      nextMeals,
    );
    const retainedIds = new Set(localPreparedPhotos(nextMeals).map((photo) => photo.uploadId));
    const discarded = localPreparedPhotos(mealsRef.current).filter(
      (photo) => !retainedIds.has(photo.uploadId),
    );
    mealsRef.current = nextMeals;
    setMeals(nextMeals);
    void cleanupPreparedPhotos(discarded);
  }

  function replaceOtherFluids(nextFluids: ClientOtherFluidDraft[]) {
    stagedPhotoDeletionsRef.current = stageRemovedDraftEntryPhotos(
      stagedPhotoDeletionsRef.current,
      otherFluidsRef.current,
      nextFluids,
    );
    const retainedIds = new Set(localPreparedPhotos(nextFluids).map((photo) => photo.uploadId));
    const discarded = localPreparedPhotos(otherFluidsRef.current).filter(
      (photo) => !retainedIds.has(photo.uploadId),
    );
    otherFluidsRef.current = nextFluids;
    setOtherFluids(nextFluids);
    void cleanupPreparedPhotos(discarded);
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

  function confirmDeletePhoto(
    photo: PersistedEntryPhoto,
    contextType: 'meal' | 'fluid',
    index: number,
  ) {
    Alert.alert(t(locale, 'common.delete'), t(locale, 'photo.deleteConfirm'), [
      { style: 'cancel', text: t(locale, 'common.cancel') },
      {
        style: 'destructive',
        text: t(locale, 'common.delete'),
        onPress: () => {
          if (contextType === 'meal') {
            replaceMeals(
              mealsRef.current.map((meal, mealIndex) =>
                mealIndex === index
                  ? {
                      ...meal,
                      existingPhotos: meal.existingPhotos?.filter((item) => item.id !== photo.id),
                    }
                  : meal,
              ),
            );
          } else {
            replaceOtherFluids(
              otherFluidsRef.current.map((fluid, fluidIndex) =>
                fluidIndex === index
                  ? {
                      ...fluid,
                      existingPhotos: fluid.existingPhotos?.filter((item) => item.id !== photo.id),
                    }
                  : fluid,
              ),
            );
          }
        },
      },
    ]);
  }

  useEffect(() => {
    let active = true;
    const range = localDayRange(day);

    void Promise.all([
      getPatientFoodForm(client, profile.id, range.start, range.end),
      listPatientMeals(client, profile.id, range.start, range.end),
    ])
      .then(async ([foodRecord, mealRecords]) => {
        if (!active) return;
        const nextHydration = toHydrationDraft(foodRecord?.details ?? null);
        const nextFoodEntryId = foodRecord?.entryId ?? null;
        const fluidRecords = nextFoodEntryId
          ? await listPatientOtherFluids(client, nextFoodEntryId)
          : [];
        const baseMeals = toMealDrafts(mealRecords);
        const baseOtherFluids = toOtherFluidDrafts(fluidRecords, nextHydration.otherFluids);
        if (!active) return;
        setHydration(nextHydration);
        setWaterText(formatWaterLiters(nextHydration.waterLiters));
        mealsRef.current = baseMeals;
        otherFluidsRef.current = baseOtherFluids;
        setMeals(baseMeals);
        setOtherFluids(baseOtherFluids);
        setPhotoLoadInput({
          foodEntryId: nextFoodEntryId,
          meals: baseMeals,
          otherFluids: baseOtherFluids,
        });
      })
      .catch(() => {
        if (active) {
          setLoadFailed(true);
          setError(t(locale, 'food.loadError'));
        }
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [client, day, loadAttempt, locale, profile.id]);

  useEffect(() => {
    if (!photoLoadInput) return;
    let active = true;
    void Promise.all([
      withMealPhotos(client, photoLoadInput.meals),
      withFluidPhotos(client, photoLoadInput.foodEntryId, photoLoadInput.otherFluids),
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
      const pendingPhotoDeletions = await loadPendingPhotoDeletions(profile.id);
      if (pendingPhotoDeletions.length) {
        await deleteQueuedEntryPhotos(client, pendingPhotoDeletions);
        try {
          await savePendingPhotoDeletions(profile.id, []);
        } catch {
          // Cleanup is idempotent; a stale queue can safely retry later.
        }
      }
      await resolveStagedPhotoDeletions();
      const range = localDayRange(day);
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
      const nextHydration = toHydrationDraft(foodRecord?.details ?? null);
      const nextFoodEntryId = foodRecord?.entryId ?? null;
      const nextMeals = toMealDrafts(mealRecords);
      const fluidRecords = nextFoodEntryId
        ? await listPatientOtherFluids(client, nextFoodEntryId)
        : [];
      const nextOtherFluids = toOtherFluidDrafts(fluidRecords, nextHydration.otherFluids);

      for (let i = 0; i < meals.length; i++) {
        const mealDraft = meals[i];
        if (mealDraft && mealDraft.localPhoto) {
          const localPhoto = mealDraft.localPhoto;
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
          if (!uploadedPhotoIdsRef.current.has(localPhoto.uploadId)) {
            await uploadPreparedEntryPhoto(client, {
              contextLabel: savedMeal.name || undefined,
              contextType: 'meal',
              entryId: savedMeal.entryId,
              patientId: profile.id,
              photoId: localPhoto.uploadId,
              photoBody: localPhoto.photoBytes,
              thumbnailBody: localPhoto.thumbnailBytes,
              metadata: {
                originalFilename: localPhoto.originalFilename,
                mimeType: PHOTO_MIME_TYPE,
                widthPx: localPhoto.photo.width,
                heightPx: localPhoto.photo.height,
                sizeBytes: localPhoto.photoBytes.byteLength,
                thumbnail: {
                  widthPx: localPhoto.thumbnail.width,
                  heightPx: localPhoto.thumbnail.height,
                  sizeBytes: localPhoto.thumbnailBytes.byteLength,
                },
              },
            });
            uploadedPhotoIdsRef.current.add(localPhoto.uploadId);
          }
          const nextMealDrafts = mealsRef.current.map((draft, index) =>
            index === i ? { ...draft, entryId: savedMeal.entryId, localPhoto: null } : draft,
          );
          replaceMeals(nextMealDrafts);
          await cleanupPreparedPhoto(localPhoto);
        }
      }

      for (let i = 0; i < otherFluids.length; i++) {
        const fluidDraft = otherFluids[i];
        if (fluidDraft && fluidDraft.localPhoto) {
          const localPhoto = fluidDraft.localPhoto;
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

          if (!uploadedPhotoIdsRef.current.has(localPhoto.uploadId)) {
            await uploadPreparedEntryPhoto(client, {
              contextLabel: fluidPhotoContextLabel(locale, fluidDraft.name),
              contextType: 'fluid',
              entryId: savedFluid.entryId,
              patientId: profile.id,
              photoId: localPhoto.uploadId,
              photoBody: localPhoto.photoBytes,
              thumbnailBody: localPhoto.thumbnailBytes,
              metadata: {
                originalFilename: localPhoto.originalFilename,
                mimeType: PHOTO_MIME_TYPE,
                widthPx: localPhoto.photo.width,
                heightPx: localPhoto.photo.height,
                sizeBytes: localPhoto.photoBytes.byteLength,
                thumbnail: {
                  widthPx: localPhoto.thumbnail.width,
                  heightPx: localPhoto.thumbnail.height,
                  sizeBytes: localPhoto.thumbnailBytes.byteLength,
                },
              },
            });
            uploadedPhotoIdsRef.current.add(localPhoto.uploadId);
          }
          const nextFluidDrafts = otherFluidsRef.current.map((draft, index) =>
            index === i
              ? { ...draft, entryId: savedFluid.entryId ?? undefined, localPhoto: null }
              : draft,
          );
          replaceOtherFluids(nextFluidDrafts);
          await cleanupPreparedPhoto(localPhoto);
        }
      }

      await drainPendingPatientPhotoCleanups(client);
      stagedPhotoDeletionsRef.current = createStagedEntryPhotoDeletions();

      setHydration(nextHydration);
      setWaterText(formatWaterLiters(nextHydration.waterLiters));
      mealsRef.current = nextMeals;
      otherFluidsRef.current = nextOtherFluids;
      setMeals(nextMeals);
      setOtherFluids(nextOtherFluids);
      setPhotoLoadFailed(false);
      setPhotoLoadInput({
        foodEntryId: nextFoodEntryId,
        meals: nextMeals,
        otherFluids: nextOtherFluids,
      });
      setMessage(t(locale, 'food.saved'));
      onSaved();
    } catch {
      setError(t(locale, 'food.saveError'));
    } finally {
      setSaving(false);
    }
  }

  async function leaveForm(callback: (() => void) | undefined) {
    const retainedPhotos = [
      ...localPreparedPhotos(mealsRef.current),
      ...localPreparedPhotos(otherFluidsRef.current),
    ];
    mealsRef.current = mealsRef.current.map((draft) => ({ ...draft, localPhoto: null }));
    otherFluidsRef.current = otherFluidsRef.current.map((draft) => ({
      ...draft,
      localPhoto: null,
    }));
    await cleanupPreparedPhotos(retainedPhotos);
    callback?.();
  }

  if (!loading && loadFailed) {
    return (
      <TactileFormShell
        error={error ?? t(locale, 'food.loadError')}
        guardUnsavedChanges={false}
        hideNav
        onCancelToday={onBack}
        subtitle={t(locale, 'food.subtitle')}
        title={t(locale, 'food.title')}
      >
        <PrimaryButton
          label={t(locale, 'common.retry')}
          onPress={() => {
            setLoading(true);
            setLoadFailed(false);
            setError(null);
            setMessage(null);
            setPhotoLoadInput(null);
            setPhotoLoadFailed(false);
            setLoadAttempt((current) => current + 1);
          }}
        />
        <PrimaryButton label={t(locale, 'common.back')} onPress={onBack} variant="secondary" />
      </TactileFormShell>
    );
  }

  if (photoTarget) {
    return (
      <PhotoUploadScreen
        client={client}
        contextLabel={photoTarget.contextLabel}
        contextType={photoTarget.contextType}
        onBack={() => setPhotoTarget(null)}
        onPhotoPrepared={(preparedPhoto) => {
          if (photoTarget.contextType === 'meal') {
            replaceMeals(
              mealsRef.current.map((meal, index) =>
                index === photoTarget.index ? { ...meal, localPhoto: preparedPhoto } : meal,
              ),
            );
          } else {
            replaceOtherFluids(
              otherFluidsRef.current.map((fluid, index) =>
                index === photoTarget.index ? { ...fluid, localPhoto: preparedPhoto } : fluid,
              ),
            );
          }
          setPhotoTarget(null);
        }}
        profile={profile}
      />
    );
  }

  return (
    <TactileFormShell
      error={error}
      footer={
        photoLoadFailed ? (
          <TactileSectionCard icon="⚠️" palette={palette} title={t(locale, 'photo.loadError')}>
            <PrimaryButton
              busy={photoLoading}
              label={t(locale, 'common.retry')}
              onPress={() => {
                setPhotoLoading(true);
                setPhotoLoadAttempt((current) => current + 1);
              }}
              variant="secondary"
            />
          </TactileSectionCard>
        ) : undefined
      }
      loading={loading}
      message={message}
      onCancelProfile={onCancelProfile ? () => void leaveForm(onCancelProfile) : undefined}
      onCancelTimeline={onCancelTimeline ? () => void leaveForm(onCancelTimeline) : undefined}
      onCancelToday={() => void leaveForm(onBack)}
      onSave={() => void save()}
      saveBusy={saving}
      subtitle={t(locale, 'food.subtitle')}
      title={t(locale, 'food.title')}
    >
      <TactileSectionCard icon="🍽" palette={palette} title={t(locale, 'food.title')}>
        <MealFields
          createMeal={createEmptyMealDraft}
          meals={meals}
          onAddPhoto={(meal, index) => {
            setPhotoTarget({
              contextType: 'meal',
              contextLabel:
                meal.name?.trim() ||
                t(locale, 'photo.mealFallback').replace('{number}', String(index + 1)),
              index,
            });
          }}
          onChange={replaceMeals}
          onDeletePhoto={(photo, index) => confirmDeletePhoto(photo, 'meal', index)}
        />
      </TactileSectionCard>

      <TactileSectionCard icon="💧" palette={palette} title={t(locale, 'food.waterTitle')}>
        <FormField
          keyboardType="decimal-pad"
          label={t(locale, 'food.waterAmountLiters')}
          labelStyle={label}
          onBlur={() => setWaterText((current) => normalizeWaterLitersText(current))}
          onChangeText={(value) => {
            setWaterText(value);
            setHydration((current) => ({
              ...current,
              waterLiters: parseWaterLitersInput(value),
            }));
          }}
          placeholder="2.0"
          style={pill}
          value={waterText}
        />
        <TactileChoiceRow
          label={t(locale, 'food.otherFluids')}
          mode="segmented"
          onChange={(value) => {
            const hasOtherFluids = value === 'yes';
            setHydration((current) => ({
              ...current,
              hasOtherFluids,
              otherFluids: hasOtherFluids ? current.otherFluids : '',
            }));
          }}
          options={[
            { value: 'yes', label: t(locale, 'common.yes') },
            { value: 'no', label: t(locale, 'common.no') },
          ]}
          palette={palette}
          value={
            hydration.hasOtherFluids === undefined
              ? undefined
              : hydration.hasOtherFluids
                ? 'yes'
                : 'no'
          }
        />
        {hydration.hasOtherFluids ? (
          <OtherFluidFields
            createFluid={createEmptyOtherFluidDraft}
            fluids={otherFluids}
            onAddPhoto={(fluid, index) => {
              setPhotoTarget({
                contextType: 'fluid',
                contextLabel:
                  fluid.name?.trim() ||
                  t(locale, 'photo.fluidFallback').replace('{number}', String(index + 1)),
                index,
              });
            }}
            onChange={replaceOtherFluids}
            onDeletePhoto={(photo, index) => confirmDeletePhoto(photo, 'fluid', index)}
          />
        ) : null}
      </TactileSectionCard>
    </TactileFormShell>
  );
}
