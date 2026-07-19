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
import { PHOTO_MIME_TYPE } from '@project4/photo';
import {
  createEntryPhotoSignedUrl,
  deleteEntryPhotos,
  getPatientFoodForm,
  listEntryPhotos,
  listPatientOtherFluids,
  listPatientMeals,
  savePatientFoodForm,
  uploadPreparedEntryPhoto,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useEffect, useRef, useState } from 'react';

import { FormField } from '../components/FormField';
import { cleanupPreparedPhoto } from '../lib/preparedPhotos';
import { MealFields, type ClientMealDraft } from '../components/MealFields';
import { OtherFluidFields, type ClientOtherFluidDraft } from '../components/OtherFluidFields';
import { TactileChoiceRow } from '../components/TactileChoiceRow';
import { TactileFormShell, useTactileFormPalette } from '../components/TactileFormShell';
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

function localPreparedPhotos(
  drafts: { localPhoto?: PreparedPhoto | null }[],
): PreparedPhoto[] {
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

  return fluidsWithMatchedPhotos.map((fluid, index) =>
    index === 0
      ? { ...fluid, existingPhotoUris: [...(fluid.existingPhotoUris ?? []), ...unmatchedUris] }
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
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [photoTarget, setPhotoTarget] = useState<FoodPhotoTarget | null>(null);
  const mealsRef = useRef(meals);
  const otherFluidsRef = useRef(otherFluids);
  const uploadedPhotoIdsRef = useRef(new Set<string>());

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
    const retainedIds = new Set(localPreparedPhotos(nextMeals).map((photo) => photo.uploadId));
    const discarded = localPreparedPhotos(mealsRef.current).filter(
      (photo) => !retainedIds.has(photo.uploadId),
    );
    mealsRef.current = nextMeals;
    setMeals(nextMeals);
    void cleanupPreparedPhotos(discarded);
  }

  function replaceOtherFluids(nextFluids: ClientOtherFluidDraft[]) {
    const retainedIds = new Set(localPreparedPhotos(nextFluids).map((photo) => photo.uploadId));
    const discarded = localPreparedPhotos(otherFluidsRef.current).filter(
      (photo) => !retainedIds.has(photo.uploadId),
    );
    otherFluidsRef.current = nextFluids;
    setOtherFluids(nextFluids);
    void cleanupPreparedPhotos(discarded);
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
        const [nextMeals, nextOtherFluids] = await Promise.all([
          withMealPhotoUris(client, toMealDrafts(mealRecords)),
          withFluidPhotoUris(
            client,
            nextFoodEntryId,
            toOtherFluidDrafts(fluidRecords, nextHydration.otherFluids),
          ),
        ]);
        if (!active) return;
        setHydration(nextHydration);
        setWaterText(formatWaterLiters(nextHydration.waterLiters));
        replaceMeals(nextMeals);
        replaceOtherFluids(nextOtherFluids);
      })
      .catch(() => active && setError(t(locale, 'food.loadError')))
      .finally(() => active && setLoading(false));

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
      const range = localDayRange(day);
      await savePatientFoodForm(client, range, normalizedHydration, mealsToSave);

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

      if (hydration.hasOtherFluids !== true && nextFoodEntryId) {
        const legacyFluidPhotos = (await listEntryPhotos(client, nextFoodEntryId)).filter(
          (photo) => photo.contextType === 'fluid',
        );
        await deleteEntryPhotos(client, legacyFluidPhotos);
      }

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
              contextLabel: fluidDraft.name?.trim() || 'Fluid photo',
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

      setHydration(nextHydration);
      setWaterText(formatWaterLiters(nextHydration.waterLiters));
      const [nextMealsWithPhotos, nextOtherFluidsWithPhotos] = await Promise.all([
        withMealPhotoUris(client, nextMeals),
        withFluidPhotoUris(client, nextFoodEntryId, nextOtherFluids),
      ]);
      replaceMeals(nextMealsWithPhotos);
      replaceOtherFluids(nextOtherFluidsWithPhotos);
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
      loading={loading}
      message={message}
      onCancelProfile={
        onCancelProfile ? () => void leaveForm(onCancelProfile) : undefined
      }
      onCancelTimeline={
        onCancelTimeline ? () => void leaveForm(onCancelTimeline) : undefined
      }
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
            if (!hasOtherFluids) {
              replaceOtherFluids([createEmptyOtherFluidDraft()]);
            }
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
          />
        ) : null}
      </TactileSectionCard>
    </TactileFormShell>
  );
}
