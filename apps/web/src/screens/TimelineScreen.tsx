import {
  filterPatientTimelineEntries,
  isNoStoolTodayEntry,
  type EntryKind,
  type PatientEntry,
  type UserProfile,
  type FoodFormRecord,
} from '@project4/contracts';
import type { DailyFormDetails } from '@project4/contracts';
import {
  hasDailyFormProgress,
  isCompleteDailyForm,
  isFoodFormComplete,
  isFoodFormStarted,
  type DailyFormDraft,
  type FoodHydrationDraft,
} from '@project4/forms';
import { getActiveLocale, t, type TranslationKey } from '@project4/i18n';
import {
  isPendingEntryId,
  mergePendingTextEntries,
  pendingTimelineEntryIds,
  removePendingEntry,
  type LocalPendingEntry,
  type PendingNoteUpdatePayload,
  type PendingTextEntryPayload,
  type PendingTimestampUpdatePayload,
} from '@project4/sync';
import {
  completePatientDailyForm,
  createPatientNote,
  createEntryPhotoSignedUrl,
  getPatientBaseline,
  getPatientDailyForm,
  getPatientFoodForm,
  listEntryPhotos,
  listPatientEntriesInRange,
  listRecentPatientEntries,
  redeemDoctorInviteCode,
  updateEntryTimestamp,
  listCompletePatientMealEntryIds,
  listCompletePatientMedicationEntryIds,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

import {
  appendPendingEntry,
  loadCachedEntriesForDay,
  loadCachedOpenedDayEntries,
  loadCachedRecentEntries,
  loadPendingEntries,
  saveCachedOpenedDayEntries,
  saveCachedRecentEntries,
  savePendingEntries,
} from '../offline/pendingEntries';
import { BaselineScreen } from './BaselineScreen';
import { DailyFormScreen } from './DailyFormScreen';
import { ExerciseFormScreen } from './ExerciseFormScreen';
import { FoodFormScreen } from './FoodFormScreen';
import { MedicationFormScreen } from './MedicationFormScreen';
import { MenstruationFormScreen } from './MenstruationFormScreen';
import { NoteFormScreen } from './NoteFormScreen';
import { StoolFormScreen } from './StoolFormScreen';
import { SymptomFormScreen } from './SymptomFormScreen';

interface TimelineScreenProps {
  client: AppSupabaseClient;
  profile: UserProfile;
  onOpenSettings: () => void;
  onSignOut: () => Promise<void>;
}

interface LoadEntriesOptions {
  showLoading?: boolean;
}

interface TimelineEntryPhoto {
  id: string;
  label: string;
  photoUrl: string;
  thumbnailUrl: string;
}

const ONLINE_LOAD_TIMEOUT_MS = 2_500;
const ONLINE_MODE_CHECK_MS = 2_000;
const OFFLINE_MODE_CHECK_MS = 2_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Request timed out')), timeoutMs);

    promise
      .then(resolve, reject)
      .finally(() => window.clearTimeout(timeout));
  });
}

function localDateValue(value: Date): string {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

function hasTodayEntry(entries: PatientEntry[], kind: PatientEntry['kind']): boolean {
  const today = localDateValue(new Date());
  return entries.some(
    (entry) => entry.kind === kind && localDateValue(new Date(entry.occurredAt)) === today,
  );
}

function hasTodayNoStoolEntry(entries: PatientEntry[]): boolean {
  const today = localDateValue(new Date());
  return entries.some(
    (entry) => isNoStoolTodayEntry(entry) && localDateValue(new Date(entry.occurredAt)) === today,
  );
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

function recentLocalDays(count = 8): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let index = 0; index < count; index += 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - index);
    days.push(localDateValue(day));
  }
  return days;
}

function toDailyDraft(details: DailyFormDetails | null): DailyFormDraft {
  if (!details) return {};
  return {
    wakeTime: details.wakeTime ?? undefined,
    sleepDuration: details.sleepDuration ?? undefined,
    appetite: details.appetite ?? undefined,
    hadPhysicalActivity: details.hadPhysicalActivity ?? undefined,
    activityNotes: details.activityNotes ?? undefined,
    stressLevel: details.stressLevel ?? undefined,
    dayDescription: details.dayDescription ?? undefined,
    tookChronicTherapy: details.tookChronicTherapy ?? undefined,
    tookMedicationOutsideChronicTherapy: details.tookMedicationOutsideChronicTherapy ?? undefined,
    medicationOutsideChronicTherapy: details.medicationOutsideChronicTherapy ?? undefined,
    hadMenstruation: details.hadMenstruation ?? undefined,
    menstruationNotes: details.menstruationNotes ?? undefined,
    energyLevel: details.energyLevel ?? undefined,
    hadNaps: details.hadNaps ?? undefined,
    naps: details.naps ?? undefined,
  };
}

function greetingKey(hour: number): TranslationKey {
  if (hour < 12) return 'home.greeting.morning';
  if (hour < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

const quickActions = [
  { id: 'daily', icon: '☀️', labelKey: 'home.action.daily', kind: 'daily' },
  { id: 'food', icon: '🍽️', labelKey: 'home.action.food', kind: 'meal' },
  { id: 'symptoms', icon: '⚠️', labelKey: 'home.action.symptoms', kind: 'symptom' },
  { id: 'exercise', icon: '🏃', labelKey: 'home.action.exercise', kind: 'exercise' },
  { id: 'stool', icon: '💩', labelKey: 'home.action.stool', kind: 'stool' },
  { id: 'medication', icon: '💊', labelKey: 'home.action.medication', kind: 'medication' },
  { id: 'period', icon: '🩸', labelKey: 'home.action.period', kind: 'menstruation' },
  { id: 'notes', icon: '📝', labelKey: 'home.action.notes', kind: 'note' },
] as const;

const entryIcons: Record<EntryKind, string> = {
  text: '📝',
  daily: '☀️',
  meal: '🍽️',
  fluid: '🥤',
  symptom: '⚠️',
  stool: '💩',
  medication: '💊',
  exercise: '🏃',
  menstruation: '🩸',
  note: '📝',
  custom: '📋',
};

export function TimelineScreen({ client, profile, onOpenSettings, onSignOut }: TimelineScreenProps) {
  const locale = getActiveLocale();
  const [entries, setEntries] = useState<PatientEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showBaseline, setShowBaseline] = useState(false);
  const [showDailyForm, setShowDailyForm] = useState(false);
  const [showSymptomForm, setShowSymptomForm] = useState(false);
  const [showStoolForm, setShowStoolForm] = useState(false);
  const [stoolEntryToEdit, setStoolEntryToEdit] = useState<PatientEntry | null>(null);
  const [showFoodForm, setShowFoodForm] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [medicationEntryToEdit, setMedicationEntryToEdit] = useState<PatientEntry | null>(null);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [exerciseEntryToEdit, setExerciseEntryToEdit] = useState<PatientEntry | null>(null);
  const [exerciseRequired, setExerciseRequired] = useState(false);
  const [exerciseCompleted, setExerciseCompleted] = useState(false);
  const [medicationRequired, setMedicationRequired] = useState(false);
  const [medicationCompleted, setMedicationCompleted] = useState(false);
  const [periodRequired, setPeriodRequired] = useState(false);
  const [periodCompleted, setPeriodCompleted] = useState(false);
  const [dailyEntryId, setDailyEntryId] = useState<string | null>(null);
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [dailyReadyToSubmit, setDailyReadyToSubmit] = useState(false);
  const [submittingDay, setSubmittingDay] = useState(false);
  const [showTimelineList, setShowTimelineList] = useState(false);
  const [timelineDay, setTimelineDay] = useState(() => localDateValue(new Date()));
  const [timelineDayEntries, setTimelineDayEntries] = useState<PatientEntry[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [showMenstruationForm, setShowMenstruationForm] = useState(false);
  const [menstruationEntryToEdit, setMenstruationEntryToEdit] = useState<PatientEntry | null>(
    null,
  );
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteEntryToEdit, setNoteEntryToEdit] = useState<PatientEntry | null>(null);
  const [canTrackMenstruation, setCanTrackMenstruation] = useState(false);
  const [foodForm, setFoodForm] = useState<FoodFormRecord | null>(null);
  const [pendingEntries, setPendingEntries] = useState<LocalPendingEntry[]>([]);
  const [entryPhotos, setEntryPhotos] = useState<Record<string, TimelineEntryPhoto[]>>({});
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; label: string } | null>(null);
  const [completeMealEntryIds, setCompleteMealEntryIds] = useState<string[]>([]);
  const [completeMedicationEntryIds, setCompleteMedicationEntryIds] = useState<string[]>([]);
  const [doctorInviteCode, setDoctorInviteCode] = useState('');
  const [doctorInviteMessage, setDoctorInviteMessage] = useState<string | null>(null);
  const [doctorInviteRedeeming, setDoctorInviteRedeeming] = useState(false);
  const syncPendingPromiseRef = useRef<Promise<LocalPendingEntry[]> | null>(null);
  const loadEntriesPromiseRef = useRef<Promise<void> | null>(null);
  const timelineDayRequestIdRef = useRef(0);

  const handleActivityAnswerChange = useCallback((answer: boolean | undefined) => {
    setExerciseRequired(answer === true);
  }, []);

  const handleMedicationAnswerChange = useCallback((answer: boolean | undefined) => {
    setMedicationRequired(answer === true);
  }, []);

  const handleMenstruationAnswerChange = useCallback((answer: boolean | undefined) => {
    setPeriodRequired(answer === true);
  }, []);

  const loadPendingQueue = useCallback(() => {
    setPendingEntries(loadPendingEntries(profile.id));
  }, [profile.id]);

  const syncPendingQueue = useCallback(async () => {
    if (syncPendingPromiseRef.current) return syncPendingPromiseRef.current;

    const syncPromise = (async () => {
      const queuedEntries = loadPendingEntries(profile.id);
      let remainingEntries = queuedEntries;

      for (const pendingEntry of queuedEntries) {
        try {
          if (pendingEntry.operation === 'create_text_entry') {
            const payload = pendingEntry.payload as PendingTextEntryPayload;
            await createPatientNote(client, profile.id, {
              occurredAt: payload.occurredAt,
              text: payload.text,
            });
          } else if (pendingEntry.operation === 'update_note') {
            const payload = pendingEntry.payload as PendingNoteUpdatePayload;
            await createPatientNote(client, profile.id, {
              entryId: payload.entryId,
              occurredAt: payload.occurredAt,
              text: payload.text,
            });
          } else {
            const payload = pendingEntry.payload as PendingTimestampUpdatePayload;
            await updateEntryTimestamp(client, payload.entryId, payload.occurredAt);
          }
          remainingEntries = removePendingEntry(remainingEntries, pendingEntry.id);
          savePendingEntries(profile.id, remainingEntries);
        } catch {
          break;
        }
      }

      setPendingEntries(remainingEntries);
      return remainingEntries;
    })();

    syncPendingPromiseRef.current = syncPromise;
    try {
      return await syncPromise;
    } finally {
      syncPendingPromiseRef.current = null;
    }
  }, [client, profile.id]);

  const entryLocalDay = useCallback(
    (entry: PatientEntry) => localDateValue(new Date(entry.occurredAt)),
    [],
  );

  const loadTimelineDay = useCallback(
    async (day: string, options: LoadEntriesOptions = {}) => {
      const requestId = timelineDayRequestIdRef.current + 1;
      timelineDayRequestIdRef.current = requestId;

      if (options.showLoading !== false) {
        setTimelineLoading(true);
      }
      setTimelineError(null);

      try {
        await withTimeout(syncPendingQueue(), ONLINE_LOAD_TIMEOUT_MS);
        const range = dayRange(day);
        const nextEntries = await withTimeout(
          listPatientEntriesInRange(client, profile.id, range.start, range.end),
          ONLINE_LOAD_TIMEOUT_MS,
        );
        if (requestId !== timelineDayRequestIdRef.current) return;

        const visible = filterPatientTimelineEntries(
          nextEntries,
          canTrackMenstruation ? 'female' : null,
        );
        setTimelineDayEntries(visible);
        setOfflineMode(false);
        saveCachedOpenedDayEntries(profile.id, visible, entryLocalDay, [day]);
      } catch {
        if (requestId !== timelineDayRequestIdRef.current) return;

        const cached = loadCachedEntriesForDay(profile.id, day, entryLocalDay);
        if (requestId !== timelineDayRequestIdRef.current) return;

        setOfflineMode(true);
        if (cached.length) {
          setTimelineDayEntries(
            filterPatientTimelineEntries(cached, canTrackMenstruation ? 'female' : null),
          );
          setTimelineError(null);
        } else {
          setTimelineDayEntries([]);
          setTimelineError(t(locale, 'entry.loadError'));
        }
      } finally {
        if (requestId === timelineDayRequestIdRef.current) {
          setTimelineLoading(false);
        }
      }
    },
    [canTrackMenstruation, client, entryLocalDay, locale, profile.id, syncPendingQueue],
  );

  const openTimeline = useCallback(() => {
    const today = localDateValue(new Date());
    setTimelineDay(today);
    setShowTimelineList(true);
    void loadTimelineDay(today);
  }, [loadTimelineDay]);

  const handleTimelineDayChange = useCallback(
    (day: string) => {
      if (!day) return;
      setTimelineDay(day);
      void loadTimelineDay(day);
    },
    [loadTimelineDay],
  );

  const loadEntries = useCallback(async (options: LoadEntriesOptions = {}) => {
    if (loadEntriesPromiseRef.current) return loadEntriesPromiseRef.current;

    const loadPromise = (async () => {
      if (options.showLoading !== false) {
        setLoading(true);
      }
      setError(null);
      try {
        await withTimeout(syncPendingQueue(), ONLINE_LOAD_TIMEOUT_MS);
        const range = dayRange(localDateValue(new Date()));
        const [nextEntries, baseline, dailyForm, foodFormDetails] = await withTimeout(
          Promise.all([
            listRecentPatientEntries(client, profile.id),
            getPatientBaseline(client, profile.id),
            getPatientDailyForm(client, profile.id, range.start, range.end),
            getPatientFoodForm(client, profile.id, range.start, range.end),
          ]),
          ONLINE_LOAD_TIMEOUT_MS,
        );
        setOfflineMode(false);
        setFoodForm(foodFormDetails);
        saveCachedRecentEntries(profile.id, nextEntries);
        saveCachedOpenedDayEntries(profile.id, nextEntries, (entry) =>
          localDateValue(new Date(entry.occurredAt)),
          recentLocalDays(),
        );
        const nextHasChronicTherapy = Boolean(baseline?.chronicTherapy?.trim());
        const includeMenstruation = baseline?.sex === 'female';
        const dailyDraft = dailyForm ? toDailyDraft(dailyForm.details) : null;
        const visibleDailyEntryIds =
          dailyForm && (dailyForm.details.completedAt || hasDailyFormProgress(dailyDraft ?? {}))
            ? [dailyForm.entryId]
            : [];
        setEntries(
          filterPatientTimelineEntries(nextEntries, baseline?.sex, { visibleDailyEntryIds }),
        );
        const mealIds = nextEntries.filter((entry) => entry.kind === 'meal').map((entry) => entry.id);
        const medIds = nextEntries.filter((entry) => entry.kind === 'medication').map((entry) => entry.id);
        const [nextCompleteMealEntryIds, nextCompleteMedicationEntryIds] = await Promise.all([
          listCompletePatientMealEntryIds(client, mealIds),
          listCompletePatientMedicationEntryIds(client, medIds),
        ]);
        setCompleteMealEntryIds(nextCompleteMealEntryIds);
        setCompleteMedicationEntryIds(nextCompleteMedicationEntryIds);
        setCanTrackMenstruation(includeMenstruation);
        setDailyEntryId(dailyForm?.entryId ?? null);
        setDailyCompleted(Boolean(dailyForm?.details.completedAt));
        setDailyReadyToSubmit(
          dailyForm && dailyDraft
            ? isCompleteDailyForm(
                dailyDraft,
                includeMenstruation,
                nextHasChronicTherapy,
              )
            : false,
        );
        setExerciseRequired(dailyForm?.details.hadPhysicalActivity === true);
        setMedicationRequired(dailyForm?.details.tookMedicationOutsideChronicTherapy === true);
        setPeriodRequired(dailyForm?.details.hadMenstruation === true);
        setExerciseCompleted(hasTodayEntry(nextEntries, 'exercise'));
        setMedicationCompleted(
          nextEntries.some(
            (entry) =>
              entry.kind === 'medication' &&
              nextCompleteMedicationEntryIds.includes(entry.id) &&
              localDateValue(new Date(entry.occurredAt)) === localDateValue(new Date()),
          ),
        );
        setPeriodCompleted(hasTodayEntry(nextEntries, 'menstruation'));
      } catch {
        const cachedOpenedDayEntries = loadCachedOpenedDayEntries(profile.id);
        const cachedEntries = cachedOpenedDayEntries.length
          ? cachedOpenedDayEntries
          : loadCachedRecentEntries(profile.id);
        setOfflineMode(true);
        setFoodForm(null);
        setCompleteMealEntryIds([]);
        setCompleteMedicationEntryIds([]);
        setEntryPhotos({});
        setLightboxPhoto(null);
        if (cachedEntries.length) {
          setEntries(filterPatientTimelineEntries(cachedEntries, null));
          setError(null);
        } else {
          setError(t(locale, 'entry.loadError'));
        }
      } finally {
        setLoading(false);
      }
    })();

    loadEntriesPromiseRef.current = loadPromise;
    try {
      return await loadPromise;
    } finally {
      loadEntriesPromiseRef.current = null;
    }
  }, [client, locale, profile.id, syncPendingQueue]);

  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(() => loadPendingQueue())
      .then(() => loadEntries())
      .finally(() => {
        if (!active) return;
      });

    return () => {
      active = false;
    };
  }, [loadEntries, loadPendingQueue]);

  useEffect(() => {
    function handleFocus() {
      void loadEntries();
    }

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadEntries]);

  useEffect(() => {
    let active = true;
    const photoSource = showTimelineList ? timelineDayEntries : entries;
    const photoEntries = photoSource.filter(
      (entry) =>
        (entry.kind === 'meal' || entry.kind === 'fluid' || entry.kind === 'medication') &&
        !isPendingEntryId(entry.id),
    );

    void (async () => {
      if (offlineMode || !photoEntries.length) {
        if (active) setEntryPhotos({});
        return;
      }

      try {
        const nextEntryPhotos: Record<string, TimelineEntryPhoto[]> = {};
        await Promise.all(
          photoEntries.map(async (entry) => {
            const photos = (await listEntryPhotos(client, entry.id)).filter(
              (photo) => photo.contextType === entry.kind || photo.contextType === null,
            );

            const signedPhotos = await Promise.all(
              photos.map(async (photo) => ({
                id: photo.id,
                label: photo.contextLabel?.trim() || t(locale, `entry.kind.${entry.kind}` as TranslationKey),
                photoUrl: await createEntryPhotoSignedUrl(client, photo.photoPath),
                thumbnailUrl: await createEntryPhotoSignedUrl(client, photo.thumbnailPath),
              })),
            );

            if (signedPhotos.length) {
              nextEntryPhotos[entry.id] = signedPhotos;
            }
          }),
        );

        if (active) setEntryPhotos(nextEntryPhotos);
      } catch (photoError) {
        console.error('Failed to load timeline entry photos:', photoError);
        if (active) setEntryPhotos({});
      }
    })();

    return () => {
      active = false;
    };
  }, [client, entries, locale, offlineMode, showTimelineList, timelineDayEntries]);

  useEffect(() => {
    const retryTimer = window.setInterval(() => {
      void loadEntries({ showLoading: false });
    }, offlineMode ? OFFLINE_MODE_CHECK_MS : ONLINE_MODE_CHECK_MS);

    return () => window.clearInterval(retryTimer);
  }, [loadEntries, offlineMode]);

  function openEntry(entry: PatientEntry) {
    if (isPendingEntryId(entry.id)) return;
    if (offlineMode && entry.kind !== 'note' && entry.kind !== 'text') return;

    if (entry.kind === 'daily') {
      setShowDailyForm(true);
      return;
    }
    if (entry.kind === 'meal') {
      setShowFoodForm(true);
      return;
    }
    if (entry.kind === 'symptom') {
      setShowSymptomForm(true);
      return;
    }
    if (entry.kind === 'stool') {
      setStoolEntryToEdit(entry);
      setShowStoolForm(true);
      return;
    }
    if (isNoStoolTodayEntry(entry)) {
      setStoolEntryToEdit(null);
      setShowStoolForm(true);
      return;
    }
    if (entry.kind === 'medication') {
      setMedicationEntryToEdit(entry);
      setShowMedicationForm(true);
      return;
    }
    if (entry.kind === 'exercise') {
      setExerciseEntryToEdit(entry);
      setShowExerciseForm(true);
      return;
    }
    if (entry.kind === 'menstruation') {
      setMenstruationEntryToEdit(entry);
      setShowMenstruationForm(true);
      return;
    }
    if (entry.kind === 'note') {
      setNoteEntryToEdit(entry);
      setShowNoteForm(true);
      return;
    }
    setNoteEntryToEdit(entry);
    setShowNoteForm(true);
  }

  async function submitDay() {
    if (!dailyEntryId || dailyCompleted || !dailyReadyToSubmit) return;

    setSubmittingDay(true);
    setError(null);
    setMessage(null);
    try {
      await completePatientDailyForm(client, dailyEntryId);
      setMessage(t(locale, 'daily.completed'));
      await loadEntries();
    } catch {
      setError(t(locale, 'daily.saveError'));
    } finally {
      setSubmittingDay(false);
    }
  }

  async function redeemInviteCode() {
    if (!doctorInviteCode.trim() || offlineMode || doctorInviteRedeeming) return;

    setDoctorInviteRedeeming(true);
    setDoctorInviteMessage(null);
    try {
      await redeemDoctorInviteCode(client, doctorInviteCode);
      setDoctorInviteCode('');
      setDoctorInviteMessage(t(locale, 'patientInvite.success'));
      await loadEntries({ showLoading: false });
    } catch {
      setDoctorInviteMessage(t(locale, 'patientInvite.error'));
    } finally {
      setDoctorInviteRedeeming(false);
    }
  }

  function renderEntryPhotos(entry: PatientEntry, title: string) {
    const photos = entryPhotos[entry.id];
    if (!photos?.length) return null;

    return (
      <div className="timeline-entry-photos">
        {photos.map((photo) => (
          <button
            aria-label={photo.label}
            className="timeline-entry-photo-button"
            key={photo.id}
            onClick={() => setLightboxPhoto({ url: photo.photoUrl, label: photo.label })}
            type="button"
          >
            <img
              alt={title}
              className="timeline-entry-photo-thumb"
              src={photo.thumbnailUrl}
            />
          </button>
        ))}
      </div>
    );
  }

  if (showBaseline) {
    return (
      <BaselineScreen
        client={client}
        onBack={() => {
          setShowBaseline(false);
          setCanTrackMenstruation(false);
          setEntries((current) => filterPatientTimelineEntries(current, null));
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showDailyForm) {
    return (
      <DailyFormScreen
        client={client}
        onActivityAnswerChange={handleActivityAnswerChange}
        onMedicationAnswerChange={handleMedicationAnswerChange}
        onMenstruationAnswerChange={handleMenstruationAnswerChange}
        onBack={() => setShowDailyForm(false)}
        onSaved={() => {
          setShowDailyForm(false);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showFoodForm) {
    return (
      <FoodFormScreen
        client={client}
        onBack={() => setShowFoodForm(false)}
        onSaved={() => {
          setShowFoodForm(false);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showSymptomForm) {
    return (
      <SymptomFormScreen
        client={client}
        onBack={() => setShowSymptomForm(false)}
        onSaved={() => {
          setShowSymptomForm(false);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showStoolForm) {
    return (
      <StoolFormScreen
        client={client}
        entryToEdit={stoolEntryToEdit}
        onBack={() => {
          setShowStoolForm(false);
          setStoolEntryToEdit(null);
        }}
        onSaved={() => {
          setShowStoolForm(false);
          setStoolEntryToEdit(null);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showMedicationForm) {
    return (
      <MedicationFormScreen
        client={client}
        entryToEdit={medicationEntryToEdit}
        onBack={() => {
          setShowMedicationForm(false);
          setMedicationEntryToEdit(null);
        }}
        onSaved={() => {
          setMedicationCompleted(true);
          setShowMedicationForm(false);
          setMedicationEntryToEdit(null);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showExerciseForm) {
    return (
      <ExerciseFormScreen
        client={client}
        entryToEdit={exerciseEntryToEdit}
        onBack={() => {
          setShowExerciseForm(false);
          setExerciseEntryToEdit(null);
        }}
        onSaved={() => {
          setExerciseCompleted(true);
          setShowExerciseForm(false);
          setExerciseEntryToEdit(null);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showMenstruationForm && canTrackMenstruation) {
    return (
      <MenstruationFormScreen
        client={client}
        entryToEdit={menstruationEntryToEdit}
        onBack={() => {
          setShowMenstruationForm(false);
          setMenstruationEntryToEdit(null);
        }}
        onSaved={() => {
          setPeriodCompleted(true);
          setShowMenstruationForm(false);
          setMenstruationEntryToEdit(null);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showNoteForm) {
    return (
      <NoteFormScreen
        client={client}
        entryToEdit={noteEntryToEdit}
        onBack={() => {
          setShowNoteForm(false);
          setNoteEntryToEdit(null);
        }}
        onPendingSaved={(entry) => {
          setPendingEntries(appendPendingEntry(profile.id, entry));
        }}
        onSaved={() => {
          setShowNoteForm(false);
          setNoteEntryToEdit(null);
          setMessage(t(locale, 'note.saved'));
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  const now = new Date();
  const today = localDateValue(now);
  const visibleEntries = mergePendingTextEntries(entries, pendingEntries);
  const pendingIds = new Set(pendingTimelineEntryIds(pendingEntries));
  const todayEntries = visibleEntries.filter(
    (entry) => localDateValue(new Date(entry.occurredAt)) === today,
  );
  const visibleActions = canTrackMenstruation
    ? quickActions
    : quickActions.filter((action) => action.id !== 'period');
  const progressActions = visibleActions.filter((action) => {
    if (action.id === 'notes') return false;
    if (action.id === 'exercise') return exerciseRequired;
    if (action.id === 'medication') return medicationRequired;
    if (action.id === 'period') return periodRequired;
    return true;
  });
  const completedKinds = new Set(todayEntries.filter((entry) => !pendingIds.has(entry.id)).map((entry) => entry.kind));
  const stoolCompleted = hasTodayEntry(visibleEntries, 'stool') || hasTodayNoStoolEntry(visibleEntries);
  const todayMeals = todayEntries.filter((entry) => entry.kind === 'meal');
  const mappedMeals = todayMeals.map((m) => {
    const isComplete = completeMealEntryIds.includes(m.id);
    return {
      type: isComplete ? 'breakfast' : null,
      name: isComplete ? 'Meal' : null,
    };
  });
  const hydrationDraft: FoodHydrationDraft | null = foodForm?.details
    ? {
        waterLiters: foodForm.details.waterLiters ?? undefined,
        hasOtherFluids: foodForm.details.hasOtherFluids ?? undefined,
        otherFluids: foodForm.details.otherFluids ?? undefined,
      }
    : null;
  const foodCompleted = isFoodFormComplete(hydrationDraft, mappedMeals);
  const foodStarted = isFoodFormStarted(hydrationDraft, todayMeals);
  const completedItems = progressActions.filter((action) => {
    if (action.id === 'daily') return dailyCompleted || dailyReadyToSubmit;
    if (action.id === 'stool') return stoolCompleted;
    if (action.id === 'food') return foodCompleted;
    if (action.id === 'medication') return medicationCompleted;
    return completedKinds.has(action.kind);
  }).length;
  const progress = Math.round((completedItems / Math.max(progressActions.length, 1)) * 100);
  const displayName = profile.displayName?.trim() || t(locale, 'role.patient');
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now);
  const symptomsCompleted = completedKinds.has('symptom');
  const submitDisabled =
    submittingDay ||
    offlineMode ||
    dailyCompleted ||
    !dailyEntryId ||
    !dailyReadyToSubmit ||
    !foodCompleted ||
    (exerciseRequired && !exerciseCompleted) ||
    (medicationRequired && !medicationCompleted) ||
    (periodRequired && !periodCompleted);

  const missingSubmitSections = [
    !dailyCompleted && !dailyReadyToSubmit ? t(locale, 'home.action.daily') : null,
    !foodCompleted ? t(locale, 'home.action.food') : null,
    !symptomsCompleted ? t(locale, 'home.action.symptoms') : null,
    !stoolCompleted ? t(locale, 'home.action.stool') : null,
    exerciseRequired && !exerciseCompleted ? t(locale, 'home.action.exercise') : null,
    medicationRequired && !medicationCompleted ? t(locale, 'home.action.medication') : null,
    periodRequired && !periodCompleted ? t(locale, 'home.action.period') : null,
  ].filter(Boolean) as string[];

  const submitHelp = dailyCompleted
    ? t(locale, 'home.submitCompletedHelp')
    : offlineMode
      ? t(locale, 'offline.actionsDisabled')
      : !dailyEntryId
        ? t(locale, 'home.submitDailyFirst')
        : missingSubmitSections.length
        ? t(locale, 'home.submitMissing').replace('\n', ' ').replace('{sections}', missingSubmitSections.join(', '))
        : t(locale, 'home.submitHelp');

  if (showTimelineList) {
    const dayEntries = mergePendingTextEntries(timelineDayEntries, pendingEntries).filter(
      (entry) => entryLocalDay(entry) === timelineDay,
    );
    const dayPendingIds = new Set(
      pendingTimelineEntryIds(pendingEntries).filter((id) =>
        dayEntries.some((entry) => entry.id === id),
      ),
    );
    const todayForPicker = localDateValue(new Date());

    return (
      <main className="baseline-layout structured-entry-layout web-timeline-view">
        <div className="baseline-toolbar">
          <div>
            <p className="eyebrow">{t(locale, 'role.patient')}</p>
            <h1>{t(locale, 'timeline.title')}</h1>
          </div>
          <div className="button-row">
            <button
              className="secondary-button"
              onClick={() => setShowTimelineList(false)}
              type="button"
            >
              {t(locale, 'common.back')}
            </button>
            <button
              className="secondary-button"
              onClick={() => void loadTimelineDay(timelineDay)}
              type="button"
            >
              {t(locale, 'timeline.refresh')}
            </button>
          </div>
        </div>

        <label>
          <span>{t(locale, 'timeline.selectDay')}</span>
          <input
            max={todayForPicker}
            onChange={(event) => handleTimelineDayChange(event.target.value)}
            type="date"
            value={timelineDay}
          />
        </label>

        {timelineError ? <p className="notice error">{timelineError}</p> : null}
        {message ? <p className="notice success">{message}</p> : null}
        {timelineLoading ? <p className="empty-state">{t(locale, 'app.loading')}</p> : null}
        {!timelineLoading && dayEntries.length === 0 ? (
          <p className="empty-state">{t(locale, 'timeline.emptyDay')}</p>
        ) : null}

        <div className="web-recent-list web-timeline-list">
          {dayEntries.map((entry) => {
            const kindLabel = t(locale, `entry.kind.${entry.kind}` as TranslationKey);
            const title = isNoStoolTodayEntry(entry)
              ? t(locale, 'stool.noStoolToday')
              : entry.text?.trim() || kindLabel;
            const pending = dayPendingIds.has(entry.id);
            const entryCompleted =
              entry.kind === 'daily'
                ? dailyCompleted
                : entry.kind === 'meal'
                  ? completeMealEntryIds.includes(entry.id) && foodCompleted
                : entry.kind === 'medication'
                  ? completeMedicationEntryIds.includes(entry.id)
                : true;
            const entryStatusClass = entryCompleted || (entry.kind === 'daily' && dailyReadyToSubmit) ? 'complete' : 'draft';
            return (
              <article
                className={`web-recent-entry ${pending ? 'pending' : ''} ${
                  !entryCompleted && !(entry.kind === 'daily' && dailyReadyToSubmit) ? 'draft' : ''
                }`}
                key={entry.id}
              >
                <div className="web-recent-entry-content">
                  <span className="web-entry-icon">{entryIcons[entry.kind]}</span>
                  <span>
                    <strong>{title}</strong>
                    <small>
                      {new Intl.DateTimeFormat(locale, {
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        month: 'short',
                      }).format(new Date(entry.occurredAt))}
                    </small>
                  </span>
                  <span className="web-entry-trailing">
                    {pending ? <small className="web-entry-pending">{t(locale, 'sync.pending')}</small> : null}
                    {!pending ? (
                      <small className={`web-entry-status ${entryStatusClass}`}>
                        {t(
                          locale,
                          entryCompleted || (entry.kind === 'daily' && dailyReadyToSubmit)
                            ? 'home.action.completed'
                            : 'daily.statusDraft'
                        )}
                      </small>
                    ) : null}
                  </span>
                </div>
                {renderEntryPhotos(entry, title)}
              </article>
            );
          })}
        </div>
        {lightboxPhoto ? (
          <div className="photo-lightbox" onClick={() => setLightboxPhoto(null)}>
            <div className="photo-lightbox-content" onClick={(event) => event.stopPropagation()}>
              <button
                className="photo-lightbox-close"
                onClick={() => setLightboxPhoto(null)}
                type="button"
              >
                &times;
              </button>
              <img src={lightboxPhoto.url} alt={lightboxPhoto.label} className="photo-lightbox-img" />
              <p className="photo-lightbox-label">{lightboxPhoto.label}</p>
            </div>
          </div>
        ) : null}
      </main>
    );
  }

  return (
    <main className="web-home-layout">
      <section className="web-home-hero">
        <div className="web-home-greeting">
          <p className="web-home-date">{dateLabel}</p>
          <h1>
            {t(locale, greetingKey(now.getHours()))}, {displayName}
          </h1>
        </div>
        <div className="web-home-account">
          <button
            className="secondary-button"
            disabled={offlineMode}
            onClick={() => setShowBaseline(true)}
            title={offlineMode ? t(locale, 'offline.actionsDisabled') : undefined}
            type="button"
          >
            {t(locale, 'baseline.open')}
          </button>
          <button className="secondary-button" onClick={onOpenSettings} type="button">
            {t(locale, 'settings.title')}
          </button>
          <button className="secondary-button" onClick={() => void onSignOut()} type="button">
            {t(locale, 'auth.signOut')}
          </button>
        </div>
      </section>

      {error ? <p className="notice error">{error}</p> : null}
      {message ? <p className="notice success">{message}</p> : null}

      <section className="web-home-grid">
        <div className="web-progress-panel">
          <div
            className="web-progress-ring"
            style={{ '--progress': `${progress}%` } as CSSProperties}
          >
            <span>{progress}%</span>
          </div>
          <div>
            <h2>{t(locale, 'home.progress.title')}</h2>
            <p>
              {t(locale, 'home.progress.items')
                .replace('{completed}', String(completedItems))
                .replace('{total}', String(progressActions.length))}
            </p>
          </div>
        </div>

        <div className="web-submit-panel">
          <button
            className="primary-button"
            disabled={submitDisabled}
            onClick={() => void submitDay()}
            type="button"
          >
            {submittingDay
              ? t(locale, 'app.loading')
              : t(locale, dailyCompleted ? 'home.submitCompleted' : 'home.submit')}
          </button>
          <p>{submitHelp}</p>
        </div>
      </section>

      <section className="web-home-section web-invite-section">
        <div className="web-section-heading">
          <div>
            <h2>{t(locale, 'patientInvite.title')}</h2>
            <p>{t(locale, 'patientInvite.help')}</p>
          </div>
        </div>
        <form
          className="web-invite-form"
          onSubmit={(event) => {
            event.preventDefault();
            void redeemInviteCode();
          }}
        >
          <label>
            {t(locale, 'patientInvite.code')}
            <input
              autoCapitalize="characters"
              disabled={offlineMode || doctorInviteRedeeming}
              onChange={(event) => {
                setDoctorInviteCode(event.target.value.toUpperCase());
                setDoctorInviteMessage(null);
              }}
              placeholder={t(locale, 'patientInvite.placeholder')}
              value={doctorInviteCode}
            />
          </label>
          <button
            className="secondary-button"
            disabled={offlineMode || doctorInviteRedeeming || !doctorInviteCode.trim()}
            type="submit"
          >
            {doctorInviteRedeeming ? t(locale, 'app.loading') : t(locale, 'patientInvite.redeem')}
          </button>
        </form>
        {offlineMode && doctorInviteCode.trim() ? (
          <p className="notice error">{t(locale, 'patientInvite.offline')}</p>
        ) : null}
        {doctorInviteMessage ? (
          <p
            className={`notice ${
              doctorInviteMessage === t(locale, 'patientInvite.success') ? 'success' : 'error'
            }`}
          >
            {doctorInviteMessage}
          </p>
        ) : null}
      </section>

      <section className="web-home-section">
        <div className="web-section-heading">
          <h2>{t(locale, 'home.quickActions')}</h2>
          <button className="text-button" onClick={() => void loadEntries()} type="button">
            {t(locale, 'timeline.refresh')}
          </button>
        </div>
        <div className="web-action-grid">
          {visibleActions.map((action) => {
            const showsConditionalStatus =
              action.id === 'exercise' || action.id === 'medication' || action.id === 'period';
            const required =
              (action.id === 'exercise' && exerciseRequired && !exerciseCompleted) ||
              (action.id === 'medication' && medicationRequired && !medicationCompleted) ||
              (action.id === 'period' && periodRequired && !periodCompleted);
            const isDraft = action.id === 'food' && !foodCompleted && foodStarted;
            const completed =
              (action.id === 'daily' && (dailyCompleted || dailyReadyToSubmit)) ||
              (action.id === 'stool' && stoolCompleted) ||
              (action.id === 'symptoms' && completedKinds.has('symptom')) ||
              (action.id === 'food' && foodCompleted) ||
              (action.id === 'exercise' && exerciseCompleted) ||
              (action.id === 'medication' && medicationCompleted) ||
              (action.id === 'period' && periodCompleted);
            const statusKey = completed
              ? 'home.action.completed'
              : isDraft
                ? 'daily.statusDraft'
                : required
                  ? 'home.action.required'
                  : 'home.action.optional';
            const showStatus = showsConditionalStatus || completed || isDraft;
            const offlineDisabled = offlineMode && action.id !== 'notes';
            const onClick =
              action.id === 'daily'
                ? () => setShowDailyForm(true)
                : action.id === 'food'
                  ? () => setShowFoodForm(true)
                  : action.id === 'symptoms'
                      ? () => setShowSymptomForm(true)
                      : action.id === 'exercise'
                      ? () => {
                          setExerciseEntryToEdit(null);
                          setShowExerciseForm(true);
                        }
                      : action.id === 'stool'
                        ? () => {
                            setStoolEntryToEdit(null);
                            setShowStoolForm(true);
                          }
                        : action.id === 'medication'
                          ? () => {
                              setMedicationEntryToEdit(null);
                              setShowMedicationForm(true);
                            }
                          : action.id === 'period'
                            ? () => {
                                setMenstruationEntryToEdit(null);
                                setShowMenstruationForm(true);
                              }
                            : () => {
                                setNoteEntryToEdit(null);
                                setShowNoteForm(true);
                              };

            return (
              <button
                className={`web-action-card ${required ? 'required' : ''} ${
                  completed ? 'completed' : ''
                } ${isDraft ? 'draft' : ''} ${offlineDisabled ? 'offline-disabled' : ''}`}
                disabled={offlineDisabled}
                key={action.id}
                onClick={onClick}
                type="button"
                title={offlineDisabled ? t(locale, 'offline.actionsDisabled') : undefined}
              >
                <span className="web-action-icon">{action.icon}</span>
                <strong>{t(locale, action.labelKey)}</strong>
                {showStatus ? <small>{t(locale, statusKey)}</small> : null}
                {offlineDisabled ? <small>{t(locale, 'offline.onlyNotes')}</small> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="web-home-section">
        <div className="web-section-heading">
          <h2>{t(locale, 'home.recentEntries')}</h2>
          <button className="text-button" onClick={openTimeline} type="button">
            {t(locale, 'home.viewAll')}
          </button>
        </div>
        {loading ? <p className="empty-state">{t(locale, 'app.loading')}</p> : null}
        {!loading && todayEntries.length === 0 ? (
          <p className="empty-state">{t(locale, 'home.noEntriesToday')}</p>
        ) : null}
        <div className="web-recent-list">
          {todayEntries.slice(0, 8).map((entry) => {
            const kindLabel = t(locale, `entry.kind.${entry.kind}` as TranslationKey);
            const pending = pendingIds.has(entry.id);
            const offlineDisabled =
              offlineMode && entry.kind !== 'note' && entry.kind !== 'text';
            const entryCompleted =
              entry.kind === 'daily'
                ? dailyCompleted
                : entry.kind === 'meal'
                  ? completeMealEntryIds.includes(entry.id) && foodCompleted
                : entry.kind === 'medication'
                  ? completeMedicationEntryIds.includes(entry.id)
                : true;
            const entryStatusClass = entryCompleted || (entry.kind === 'daily' && dailyReadyToSubmit) ? 'complete' : 'draft';
            return (
              <article
                className={`web-recent-entry ${pending ? 'pending' : ''} ${
                  !entryCompleted && !(entry.kind === 'daily' && dailyReadyToSubmit) ? 'draft' : ''
                } ${offlineDisabled ? 'offline-disabled' : ''}`}
                key={entry.id}
              >
                <button
                  disabled={pending || offlineDisabled}
                  onClick={() => openEntry(entry)}
                  title={offlineDisabled ? t(locale, 'offline.actionsDisabled') : undefined}
                  type="button"
                >
                  <span className="web-entry-icon">{entryIcons[entry.kind]}</span>
                  <span>
                    <strong>{entry.text?.trim() || kindLabel}</strong>
                    <small>
                      {new Intl.DateTimeFormat(locale, {
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(entry.occurredAt))}
                    </small>
                  </span>
                  <span className="web-entry-trailing">
                    {pending ? <small className="web-entry-pending">{t(locale, 'sync.pending')}</small> : null}
                    {offlineDisabled ? (
                      <small className="web-entry-status offline">
                        {t(locale, 'offline.onlyNotes')}
                      </small>
                    ) : null}
                    {!pending ? (
                      <small className={`web-entry-status ${entryStatusClass}`}>
                        {t(
                          locale,
                          entryCompleted || (entry.kind === 'daily' && dailyReadyToSubmit)
                            ? 'home.action.completed'
                            : 'daily.statusDraft'
                        )}
                      </small>
                    ) : null}
                  </span>
                </button>
                {renderEntryPhotos(entry, entry.text?.trim() || kindLabel)}
              </article>
            );
          })}
        </div>
      </section>
      {lightboxPhoto ? (
        <div className="photo-lightbox" onClick={() => setLightboxPhoto(null)}>
          <div className="photo-lightbox-content" onClick={(event) => event.stopPropagation()}>
            <button
              className="photo-lightbox-close"
              onClick={() => setLightboxPhoto(null)}
              type="button"
            >
              &times;
            </button>
            <img src={lightboxPhoto.url} alt={lightboxPhoto.label} className="photo-lightbox-img" />
            <p className="photo-lightbox-label">{lightboxPhoto.label}</p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
