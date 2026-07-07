import {
  filterPatientTimelineEntries,
  isNoStoolTodayEntry,
  type PatientEntry,
  type UserProfile,
  type FoodFormRecord,
} from '@project4/contracts';
import {
  getDailyFormMissingFields,
  hasDailyFormProgress,
  toDailyFormDraft,
  isFoodFormComplete,
  isFoodFormStarted,
  type DailyFormField,
  type FoodHydrationDraft,
} from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
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
  getPatientBaseline,
  getPatientDailyForm,
  getPatientFoodForm,
  listCompletePatientMealEntryIds,
  listCompletePatientMedicationEntryIds,
  listRecentPatientEntries,
  updateEntryTimestamp,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  appendPendingEntry,
  loadCachedOpenedDayEntries,
  loadCachedRecentEntries,
  loadPendingEntries,
  saveCachedOpenedDayEntries,
  saveCachedRecentEntries,
  savePendingEntries,
} from '../offline/pendingEntries';
import { localDayRange, toLocalDateInput } from '../utils/dateTime';
import { BaselineScreen } from './BaselineScreen';
import { DailyProgressHomeScreen } from './DailyProgressHomeScreen';
import { DailyFormScreen } from './DailyFormScreen';
import { FoodFormScreen } from './FoodFormScreen';
import { PatientExerciseScreen } from './PatientExerciseScreen';
import { PatientMedicationScreen } from './PatientMedicationScreen';
import { PatientMenstruationScreen } from './PatientMenstruationScreen';
import { PatientNoteScreen } from './PatientNoteScreen';
import { PatientSymptomsScreen } from './PatientSymptomsScreen';
import { PatientStoolScreen } from './PatientStoolScreen';
import { PatientTimelineScreen } from './PatientTimelineScreen';

interface PatientHomeScreenProps {
  client: AppSupabaseClient;
  profile: UserProfile;
  onSignOut: () => Promise<void>;
}

interface LoadEntriesOptions {
  showLoading?: boolean;
}

const ONLINE_LOAD_TIMEOUT_MS = 2_500;
const ONLINE_MODE_CHECK_MS = 2_000;
const OFFLINE_MODE_CHECK_MS = 2_000;

function formatMissingSubmitSections(template: string, sections: string[]): string {
  if (!sections.length) return '';
  return template.replace('{sections}', sections.map((section) => `- ${section}`).join('\n'));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Request timed out')), timeoutMs);

    promise
      .then(resolve, reject)
      .finally(() => clearTimeout(timeout));
  });
}

function hasTodayEntry(entries: PatientEntry[], kind: PatientEntry['kind']): boolean {
  const today = toLocalDateInput(new Date());
  return entries.some(
    (entry) => entry.kind === kind && toLocalDateInput(new Date(entry.occurredAt)) === today,
  );
}

function hasTodayNoStoolEntry(entries: PatientEntry[]): boolean {
  const today = toLocalDateInput(new Date());
  return entries.some(
    (entry) => isNoStoolTodayEntry(entry) && toLocalDateInput(new Date(entry.occurredAt)) === today,
  );
}

function recentLocalDays(count = 8): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let index = 0; index < count; index += 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - index);
    days.push(toLocalDateInput(day));
  }
  return days;
}

export function PatientHomeScreen({ client, profile, onSignOut }: PatientHomeScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [entries, setEntries] = useState<PatientEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [showBaseline, setShowBaseline] = useState(false);
  const [showDailyForm, setShowDailyForm] = useState(false);
  const [dailyEntryId, setDailyEntryId] = useState<string | null>(null);
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [dailyMissingFields, setDailyMissingFields] = useState<DailyFormField[]>([]);
  const [submittingDay, setSubmittingDay] = useState(false);
  const [showFoodForm, setShowFoodForm] = useState(false);
  const [showSymptomForm, setShowSymptomForm] = useState(false);
  const [symptomsCompleted, setSymptomsCompleted] = useState(false);
  const [showStoolForm, setShowStoolForm] = useState(false);
  const [stoolEntryToEdit, setStoolEntryToEdit] = useState<PatientEntry | null>(null);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [medicationEntryToEdit, setMedicationEntryToEdit] = useState<PatientEntry | null>(null);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [exerciseEntryToEdit, setExerciseEntryToEdit] = useState<PatientEntry | null>(null);
  const [exerciseRequired, setExerciseRequired] = useState(false);
  const [exerciseCompleted, setExerciseCompleted] = useState(false);
  const [medicationRequired, setMedicationRequired] = useState(false);
  const [medicationCompleted, setMedicationCompleted] = useState(false);
  const [completeMealEntryIds, setCompleteMealEntryIds] = useState<string[]>([]);
  const [completeMedicationEntryIds, setCompleteMedicationEntryIds] = useState<string[]>([]);
  const [periodRequired, setPeriodRequired] = useState(false);
  const [periodCompleted, setPeriodCompleted] = useState(false);
  const [showMenstruationForm, setShowMenstruationForm] = useState(false);
  const [menstruationEntryToEdit, setMenstruationEntryToEdit] = useState<PatientEntry | null>(
    null,
  );
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteEntryToEdit, setNoteEntryToEdit] = useState<PatientEntry | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [canTrackMenstruation, setCanTrackMenstruation] = useState(false);
  const [pendingEntries, setPendingEntries] = useState<LocalPendingEntry[]>([]);
  const [foodForm, setFoodForm] = useState<FoodFormRecord | null>(null);
  const syncPendingPromiseRef = useRef<Promise<LocalPendingEntry[]> | null>(null);
  const loadEntriesPromiseRef = useRef<Promise<void> | null>(null);

  const handleActivityAnswerChange = useCallback((answer: boolean | undefined) => {
    setExerciseRequired(answer === true);
  }, []);

  const handleMedicationAnswerChange = useCallback((answer: boolean | undefined) => {
    setMedicationRequired(answer === true);
  }, []);

  const handleMenstruationAnswerChange = useCallback((answer: boolean | undefined) => {
    setPeriodRequired(answer === true);
  }, []);

  const openRecentEntry = useCallback((entry: PatientEntry) => {
    if (isPendingEntryId(entry.id)) return;
    if (offlineMode && entry.kind !== 'note' && entry.kind !== 'text') return;

    if (entry.kind === 'daily') {
      setShowDailyForm(true);
      return;
    }
    if (entry.kind === 'stool') {
      setStoolEntryToEdit(entry);
      setShowStoolForm(true);
      return;
    }
    if (isNoStoolTodayEntry(entry)) {
      setShowStoolForm(true);
      return;
    }
    if (entry.kind === 'symptom') {
      setShowSymptomForm(true);
      return;
    }
    if (entry.kind === 'exercise') {
      setExerciseEntryToEdit(entry);
      setShowExerciseForm(true);
      return;
    }
    if (entry.kind === 'medication') {
      setMedicationEntryToEdit(entry);
      setShowMedicationForm(true);
      return;
    }
    if (entry.kind === 'menstruation') {
      setMenstruationEntryToEdit(entry);
      setShowMenstruationForm(true);
      return;
    }
    if (entry.kind === 'meal') {
      setShowFoodForm(true);
      return;
    }
    setNoteEntryToEdit(entry);
    setShowNoteForm(true);
  }, [offlineMode]);

  const loadPendingQueue = useCallback(async () => {
    setPendingEntries(await loadPendingEntries(profile.id));
  }, [profile.id]);

  const syncPendingQueue = useCallback(async () => {
    if (syncPendingPromiseRef.current) return syncPendingPromiseRef.current;

    const syncPromise = (async () => {
      const queuedEntries = await loadPendingEntries(profile.id);
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
          await savePendingEntries(profile.id, remainingEntries);
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

  const loadEntries = useCallback(async (options: LoadEntriesOptions = {}) => {
    if (loadEntriesPromiseRef.current) return loadEntriesPromiseRef.current;

    const loadPromise = (async () => {
      if (options.showLoading !== false) {
        setLoading(true);
      }
      setError(null);

      try {
        await withTimeout(syncPendingQueue(), ONLINE_LOAD_TIMEOUT_MS);
        const range = localDayRange(toLocalDateInput(new Date()));
        const [nextEntries, baseline, dailyForm, foodFormDetails] = await withTimeout(
          Promise.all([
            listRecentPatientEntries(client, profile.id),
            getPatientBaseline(client, profile.id),
            getPatientDailyForm(client, profile.id, range.start, range.end),
            getPatientFoodForm(client, profile.id, range.start, range.end),
          ]),
          ONLINE_LOAD_TIMEOUT_MS,
        );
        const [nextCompleteMealEntryIds, nextCompleteMedicationEntryIds] = await withTimeout(
          Promise.all([
            listCompletePatientMealEntryIds(
              client,
              nextEntries.filter((entry) => entry.kind === 'meal').map((entry) => entry.id),
            ),
            listCompletePatientMedicationEntryIds(
              client,
              nextEntries.filter((entry) => entry.kind === 'medication').map((entry) => entry.id),
            ),
          ]),
          ONLINE_LOAD_TIMEOUT_MS,
        );
        setOfflineMode(false);
        setFoodForm(foodFormDetails);
        await saveCachedRecentEntries(profile.id, nextEntries);
        await saveCachedOpenedDayEntries(profile.id, nextEntries, (entry) =>
          toLocalDateInput(new Date(entry.occurredAt)),
          recentLocalDays(),
        );
        const dailyDraft = dailyForm ? toDailyFormDraft(dailyForm.details) : null;
        const visibleDailyEntryIds =
          dailyForm && (dailyForm.details.completedAt || hasDailyFormProgress(dailyDraft ?? {}))
            ? [dailyForm.entryId]
            : [];
        setEntries(
          filterPatientTimelineEntries(nextEntries, baseline?.sex, { visibleDailyEntryIds }),
        );
        setDailyEntryId(dailyForm?.entryId ?? null);
        setDailyCompleted(Boolean(dailyForm?.details.completedAt));
        setDailyMissingFields(
          dailyForm && dailyDraft
            ? getDailyFormMissingFields(
                dailyDraft,
                baseline?.sex === 'female',
                Boolean(baseline?.chronicTherapy?.trim()),
              )
            : [],
        );
        setExerciseRequired(dailyForm?.details.hadPhysicalActivity === true);
        setMedicationRequired(dailyForm?.details.tookMedicationOutsideChronicTherapy === true);
        setPeriodRequired(dailyForm?.details.hadMenstruation === true);
        setSymptomsCompleted(hasTodayEntry(nextEntries, 'symptom'));
        setExerciseCompleted(hasTodayEntry(nextEntries, 'exercise'));
        setCompleteMealEntryIds(nextCompleteMealEntryIds);
        setCompleteMedicationEntryIds(nextCompleteMedicationEntryIds);
        setMedicationCompleted(
          nextEntries.some(
            (entry) =>
              entry.kind === 'medication' &&
              nextCompleteMedicationEntryIds.includes(entry.id) &&
              toLocalDateInput(new Date(entry.occurredAt)) === toLocalDateInput(new Date()),
          ),
        );
        setPeriodCompleted(hasTodayEntry(nextEntries, 'menstruation'));
        setCanTrackMenstruation(baseline?.sex === 'female');
      } catch {
        const cachedOpenedDayEntries = await loadCachedOpenedDayEntries(profile.id);
        const cachedEntries = cachedOpenedDayEntries.length
          ? cachedOpenedDayEntries
          : await loadCachedRecentEntries(profile.id);
        setOfflineMode(true);
        setFoodForm(null);
        if (cachedEntries.length) {
          setEntries(filterPatientTimelineEntries(cachedEntries, null));
          setCompleteMealEntryIds([]);
          setCompleteMedicationEntryIds([]);
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
    void loadPendingQueue();
    void loadEntries().finally(() => {
      if (!active) return;
    });

    return () => {
      active = false;
    };
  }, [loadEntries, loadPendingQueue]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void loadEntries();
    });

    return () => subscription.remove();
  }, [loadEntries]);

  useEffect(() => {
    const retryTimer = setInterval(() => {
      void loadEntries({ showLoading: false });
    }, offlineMode ? OFFLINE_MODE_CHECK_MS : ONLINE_MODE_CHECK_MS);

    return () => clearInterval(retryTimer);
  }, [loadEntries, offlineMode]);

  if (showBaseline) {
    return (
      <BaselineScreen
        client={client}
        onBack={() => {
          setShowBaseline(false);
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
        onMenstruationAnswerChange={handleMenstruationAnswerChange}
        onMedicationAnswerChange={handleMedicationAnswerChange}
        onBack={() => {
          setShowDailyForm(false);
          void loadEntries();
        }}
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
      <PatientSymptomsScreen
        client={client}
        onBack={() => {
          setShowSymptomForm(false);
        }}
        onSaved={() => {
          setSymptomsCompleted(true);
          setShowSymptomForm(false);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showStoolForm) {
    return (
      <PatientStoolScreen
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
      <PatientMedicationScreen
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
      <PatientExerciseScreen
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
      <PatientMenstruationScreen
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
      <PatientNoteScreen
        client={client}
        entryToEdit={noteEntryToEdit}
        onBack={() => {
          setShowNoteForm(false);
          setNoteEntryToEdit(null);
        }}
        onPendingSaved={async (entry) => {
          setPendingEntries(await appendPendingEntry(profile.id, entry));
        }}
        onSaved={() => {
          setShowNoteForm(false);
          setNoteEntryToEdit(null);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showTimeline) {
    const visibleEntries = mergePendingTextEntries(entries, pendingEntries);
    const pendingIds = pendingTimelineEntryIds(pendingEntries);
    return (
      <PatientTimelineScreen
        entries={visibleEntries}
        error={error}
        loading={loading}
        onBack={() => setShowTimeline(false)}
        onRefresh={loadEntries}
        pendingEntryIds={pendingIds}
      />
    );
  }

  const dailyReadyToSubmit = Boolean(dailyEntryId && dailyMissingFields.length === 0);
  const today = toLocalDateInput(new Date());
  const todayMeals = entries.filter(
    (entry) =>
      entry.kind === 'meal' &&
      toLocalDateInput(new Date(entry.occurredAt)) === today,
  );
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
  const stoolCompleted = hasTodayEntry(entries, 'stool') || hasTodayNoStoolEntry(entries);
  const submitDisabled =
    loading ||
    offlineMode ||
    submittingDay ||
    dailyCompleted ||
    !dailyEntryId ||
    dailyMissingFields.length > 0 ||
    !foodCompleted ||
    (exerciseRequired && !exerciseCompleted) ||
    (medicationRequired && !medicationCompleted) ||
    (periodRequired && !periodCompleted);

  async function submitDay() {
    if (!dailyEntryId || submitDisabled) return;

    setSubmittingDay(true);
    setError(null);
    try {
      await completePatientDailyForm(client, dailyEntryId);
      await loadEntries();
    } catch {
      setError(t(locale, 'daily.saveError'));
    } finally {
      setSubmittingDay(false);
    }
  }

  const submitHelp =
    offlineMode
      ? t(locale, 'offline.actionsDisabled')
      : dailyCompleted
      ? t(locale, 'home.submitCompletedHelp')
      : (() => {
          const missingSubmitSections = [
            !dailyCompleted && !dailyReadyToSubmit ? t(locale, 'home.action.daily') : null,
            !foodCompleted ? t(locale, 'home.action.food') : null,
            !symptomsCompleted ? t(locale, 'home.action.symptoms') : null,
            !stoolCompleted ? t(locale, 'home.action.stool') : null,
            exerciseRequired && !exerciseCompleted ? t(locale, 'home.action.exercise') : null,
            medicationRequired && !medicationCompleted
              ? t(locale, 'home.action.medication')
              : null,
            periodRequired && !periodCompleted ? t(locale, 'home.action.period') : null,
          ].filter(Boolean) as string[];

          return missingSubmitSections.length
            ? formatMissingSubmitSections(t(locale, 'home.submitMissing'), missingSubmitSections)
            : t(locale, 'home.submitHelp');
        })();
  const visibleEntries = mergePendingTextEntries(entries, pendingEntries);
  const pendingIds = pendingTimelineEntryIds(pendingEntries);

  return (
    <DailyProgressHomeScreen
      canTrackMenstruation={canTrackMenstruation}
      dailyCompleted={dailyCompleted}
      dailyReadyToSubmit={dailyReadyToSubmit}
      error={error}
      exerciseCompleted={exerciseCompleted}
      exerciseRequired={exerciseRequired}
      loading={loading}
      medicationCompleted={medicationCompleted}
      completeMedicationEntryIds={completeMedicationEntryIds}
      completeMealEntryIds={completeMealEntryIds}
      foodCompleted={foodCompleted}
      foodStarted={foodStarted}
      medicationRequired={medicationRequired}
      periodCompleted={periodCompleted}
      periodRequired={periodRequired}
      stoolCompleted={stoolCompleted}
      onOpenBaseline={() => setShowBaseline(true)}
      onOpenDaily={() => setShowDailyForm(true)}
      onOpenExercise={() => {
        setExerciseEntryToEdit(null);
        setShowExerciseForm(true);
      }}
      onOpenFood={() => setShowFoodForm(true)}
      onOpenMedication={() => {
        setMedicationEntryToEdit(null);
        setShowMedicationForm(true);
      }}
      onOpenNotes={() => {
        setNoteEntryToEdit(null);
        setShowNoteForm(true);
      }}
      onOpenPeriod={() => {
        setMenstruationEntryToEdit(null);
        setShowMenstruationForm(true);
      }}
      onOpenStool={() => {
        setStoolEntryToEdit(null);
        setShowStoolForm(true);
      }}
      onOpenSymptoms={() => setShowSymptomForm(true)}
      onOpenEntry={openRecentEntry}
      onOpenTimeline={() => setShowTimeline(true)}
      onSubmitDay={submitDay}
      onSignOut={onSignOut}
      offlineMode={offlineMode}
      profile={profile}
      pendingEntryIds={pendingIds}
      recentEntries={visibleEntries}
      submitBusy={submittingDay}
      submitDisabled={submitDisabled}
      submitHelp={submitHelp}
      symptomsCompleted={symptomsCompleted}
    />
  );
}
