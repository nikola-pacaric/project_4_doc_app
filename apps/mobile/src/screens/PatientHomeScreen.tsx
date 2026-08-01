import {
  filterCachedCompactTimelineEntries,
  filterPatientTimelineEntries,
  isNoStoolTodayEntry,
  recentResearchCalendarDays,
  type PatientEntry,
  type PatientBaselineProfile,
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
import { getActiveLocale, t } from '@project4/i18n';
import {
  isPendingEntryId,
  isPendingEntryRetryable,
  markPendingEntryFailed,
  mergePendingTextEntries,
  pendingTimelineEntryIds,
  removePendingEntry,
  retryPendingEntry,
  type LocalPendingEntry,
  type PendingNoteUpdatePayload,
  type PendingTextEntryPayload,
  type PendingTimestampUpdatePayload,
} from '@project4/sync';
import {
  completePatientDailyForm,
  createPatientNote,
  deletePatientEntry,
  deleteQueuedEntryPhotos,
  drainPendingPatientPhotoCleanups,
  isTransientSupabaseError,
  getPatientBaseline,
  getPatientDailyForm,
  getPatientFoodForm,
  listCompletePatientMealEntryIds,
  listCompletePatientMedicationEntryIds,
  listPatientEntriesInRange,
  listRecentPatientEntries,
  updateEntryTimestamp,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler } from 'react-native';
import {
  type PendingSyncRecoveryBusyState,
  type PendingSyncRecoveryMessage,
} from '../components/PendingSyncRecovery';
import {
  appendPendingEntry,
  loadCachedEntriesForDay,
  loadPendingPhotoDeletions,
  savePendingPhotoDeletions,
  loadCachedOpenedDayEntries,
  loadCachedRecentEntries,
  loadPendingEntries,
  saveCachedOpenedDayEntries,
  saveCachedRecentEntries,
  updatePendingEntries,
} from '../offline/pendingEntries';
import {
  foregroundReconnectDelayMs,
  refreshForegroundPatientData,
} from '../lib/foregroundReconnectPolicy';
import { primarySubmitHelpKey } from '../lib/dailyProgressState';
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

export type PatientHomeTab = 'today' | 'timeline' | 'profile';

interface PatientHomeScreenProps {
  client: AppSupabaseClient;
  profile: UserProfile;
  onOpenSettings: () => void;
  onOfflineModeChange?: (offline: boolean) => void;
  /** Open this surface after Settings (or other app-level) returns to patient home. */
  initialTab?: PatientHomeTab;
}

interface LoadEntriesOptions {
  showLoading?: boolean;
}

const ONLINE_LOAD_TIMEOUT_MS = 2_500;

function formatMissingSubmitSections(template: string, sections: string[]): string {
  if (!sections.length) return '';
  return template.replace('{sections}', sections.join(', '));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Request timed out')), timeoutMs);

    promise.then(resolve, reject).finally(() => clearTimeout(timeout));
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
  return recentResearchCalendarDays(new Date(), count);
}

export function PatientHomeScreen({
  client,
  profile,
  onOpenSettings,
  onOfflineModeChange,
  initialTab = 'today',
}: PatientHomeScreenProps) {
  const locale = getActiveLocale();
  const [entries, setEntries] = useState<PatientEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  useEffect(() => {
    onOfflineModeChange?.(offlineMode);
  }, [offlineMode, onOfflineModeChange]);
  const [showBaseline, setShowBaseline] = useState(initialTab === 'profile');
  const [patientBaseline, setPatientBaseline] = useState<PatientBaselineProfile | null>(null);
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
  const [menstruationEntryToEdit, setMenstruationEntryToEdit] = useState<PatientEntry | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteEntryToEdit, setNoteEntryToEdit] = useState<PatientEntry | null>(null);
  const [showTimeline, setShowTimeline] = useState(initialTab === 'timeline');
  const [timelineDay, setTimelineDay] = useState(() => toLocalDateInput(new Date()));
  const [timelineDayEntries, setTimelineDayEntries] = useState<PatientEntry[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [timelineMessage, setTimelineMessage] = useState<string | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [canTrackMenstruation, setCanTrackMenstruation] = useState(false);
  const [pendingEntries, setPendingEntries] = useState<LocalPendingEntry[]>([]);
  const [pendingSyncBusy, setPendingSyncBusy] = useState<PendingSyncRecoveryBusyState | null>(null);
  const [pendingSyncMessage, setPendingSyncMessage] = useState<PendingSyncRecoveryMessage | null>(
    null,
  );
  const pendingSyncRecoveryPromiseRef = useRef<Promise<void> | null>(null);
  const [foodForm, setFoodForm] = useState<FoodFormRecord | null>(null);
  const showTimelineRef = useRef(showTimeline);
  const timelineDayRef = useRef(timelineDay);
  const syncPendingPromiseRef = useRef<Promise<LocalPendingEntry[]> | null>(null);
  const loadEntriesPromiseRef = useRef<Promise<void> | null>(null);
  const lifecycleRefreshPromiseRef = useRef<Promise<void> | null>(null);
  const timelineDayRequestIdRef = useRef(0);

  useEffect(() => {
    let active = true;
    void drainPendingPatientPhotoCleanups(client).catch(() => undefined);
    void loadPendingPhotoDeletions(profile.id)
      .then(async (pendingPhotoDeletions) => {
        if (!pendingPhotoDeletions.length) return;
        await deleteQueuedEntryPhotos(client, pendingPhotoDeletions);
        if (active) await savePendingPhotoDeletions(profile.id, []);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [client, profile.id]);

  useEffect(() => {
    showTimelineRef.current = showTimeline;
    timelineDayRef.current = timelineDay;
  }, [showTimeline, timelineDay]);

  const handleActivityAnswerChange = useCallback((answer: boolean | undefined) => {
    setExerciseRequired(answer === true);
  }, []);

  const handleMedicationAnswerChange = useCallback((answer: boolean | undefined) => {
    setMedicationRequired(answer === true);
  }, []);

  const handleMenstruationAnswerChange = useCallback((answer: boolean | undefined) => {
    setPeriodRequired(answer === true);
  }, []);

  const openRecentEntry = useCallback(
    (entry: PatientEntry) => {
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
        setStoolEntryToEdit(entry);
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
    },
    [offlineMode],
  );

  const loadPendingQueue = useCallback(async () => {
    setPendingEntries(await loadPendingEntries(profile.id));
  }, [profile.id]);

  const syncPendingQueue = useCallback(async () => {
    if (syncPendingPromiseRef.current) return syncPendingPromiseRef.current;

    const syncPromise = (async () => {
      const queuedEntries = await loadPendingEntries(profile.id);
      for (const pendingEntry of queuedEntries) {
        if (!isPendingEntryRetryable(pendingEntry)) continue;

        try {
          if (pendingEntry.operation === 'create_text_entry') {
            const payload = pendingEntry.payload as PendingTextEntryPayload;
            await createPatientNote(
              client,
              profile.id,
              {
                occurredAt: payload.occurredAt,
                text: payload.text,
              },
              { clientEntryId: pendingEntry.id },
            );
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
          await updatePendingEntries(profile.id, (current) =>
            removePendingEntry(current, pendingEntry.id),
          );
        } catch (syncError) {
          if (isTransientSupabaseError(syncError)) {
            break;
          }

          const errorCode =
            syncError &&
            typeof syncError === 'object' &&
            'code' in syncError &&
            typeof syncError.code === 'string'
              ? syncError.code
              : 'SYNC_REJECTED';
          await updatePendingEntries(profile.id, (current) =>
            current.map((entry) =>
              entry.id === pendingEntry.id ? markPendingEntryFailed(entry, errorCode) : entry,
            ),
          );
        }
      }

      const remainingEntries = await loadPendingEntries(profile.id);
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
    (entry: PatientEntry) => toLocalDateInput(new Date(entry.occurredAt)),
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
        const range = localDayRange(day);
        const nextEntries = await withTimeout(
          listPatientEntriesInRange(client, profile.id, range.start, range.end),
          ONLINE_LOAD_TIMEOUT_MS,
        );
        if (requestId !== timelineDayRequestIdRef.current) return;

        const visible = filterPatientTimelineEntries(
          nextEntries,
          canTrackMenstruation ? 'female' : null,
          { includeFluidEntries: true },
        );
        setTimelineDayEntries(visible);
        setOfflineMode(false);
        await saveCachedOpenedDayEntries(profile.id, visible, entryLocalDay, [day]);
      } catch {
        if (requestId !== timelineDayRequestIdRef.current) return;

        const cached = await loadCachedEntriesForDay(profile.id, day, entryLocalDay);
        if (requestId !== timelineDayRequestIdRef.current) return;

        setOfflineMode(true);
        if (cached.length) {
          setTimelineDayEntries(cached);
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
    const today = toLocalDateInput(new Date());
    setTimelineDay(today);
    setTimelineMessage(null);
    setShowTimeline(true);
    void loadTimelineDay(today);
  }, [loadTimelineDay]);

  useEffect(() => {
    if (!showTimeline) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowTimeline(false);
      return true;
    });

    return () => subscription.remove();
  }, [showTimeline]);

  const initialTabAppliedRef = useRef(false);
  useEffect(() => {
    if (initialTabAppliedRef.current) return;
    initialTabAppliedRef.current = true;
    if (initialTab === 'timeline') {
      openTimeline();
    }
  }, [initialTab, openTimeline]);

  const handleTimelineDayChange = useCallback(
    (day: string) => {
      setTimelineDay(day);
      setTimelineMessage(null);
      void loadTimelineDay(day);
    },
    [loadTimelineDay],
  );

  const loadEntries = useCallback(
    async (options: LoadEntriesOptions = {}) => {
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
          setPatientBaseline(baseline);
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
          setReconnectAttempt(0);
          setFoodForm(foodFormDetails);
          const dailyDraft = dailyForm ? toDailyFormDraft(dailyForm.details) : null;
          const visibleDailyEntryIds =
            dailyForm && (dailyForm.details.completedAt || hasDailyFormProgress(dailyDraft ?? {}))
              ? [dailyForm.entryId]
              : [];
          const visibleEntries = filterPatientTimelineEntries(nextEntries, baseline?.sex, {
            visibleDailyEntryIds,
          });
          await saveCachedRecentEntries(profile.id, visibleEntries);
          const detailedVisibleEntries = filterPatientTimelineEntries(nextEntries, baseline?.sex, {
            includeFluidEntries: true,
            visibleDailyEntryIds,
          });
          await saveCachedOpenedDayEntries(
            profile.id,
            detailedVisibleEntries,
            (entry) => toLocalDateInput(new Date(entry.occurredAt)),
            recentLocalDays(),
          );
          setEntries(visibleEntries);
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
          const cachedRecentEntries = await loadCachedRecentEntries(profile.id);
          const cachedEntries = cachedRecentEntries.length
            ? cachedRecentEntries
            : filterCachedCompactTimelineEntries(await loadCachedOpenedDayEntries(profile.id));
          setOfflineMode(true);
          setReconnectAttempt((current) => current + 1);
          setFoodForm(null);
          if (cachedEntries.length) {
            setEntries(cachedEntries);
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
    },
    [client, locale, profile.id, syncPendingQueue],
  );

  const refreshVisiblePatientData = useCallback(async () => {
    if (lifecycleRefreshPromiseRef.current) {
      return lifecycleRefreshPromiseRef.current;
    }

    const refreshPromise = refreshForegroundPatientData(
      () => loadEntries({ showLoading: false }),
      async () => {
        if (showTimelineRef.current) {
          await loadTimelineDay(timelineDayRef.current, { showLoading: false });
        }
      },
    );
    lifecycleRefreshPromiseRef.current = refreshPromise;

    try {
      await refreshPromise;
    } finally {
      lifecycleRefreshPromiseRef.current = null;
    }
  }, [loadEntries, loadTimelineDay]);

  const retryFailedPendingSync = useCallback(
    async (entryId: string) => {
      if (pendingSyncRecoveryPromiseRef.current) {
        return pendingSyncRecoveryPromiseRef.current;
      }

      const recoveryPromise = (async () => {
        setPendingSyncBusy({ action: 'retry', entryId });
        setPendingSyncMessage(null);
        try {
          if (syncPendingPromiseRef.current) {
            await syncPendingPromiseRef.current;
          }

          const requeued = await updatePendingEntries(profile.id, (current) =>
            retryPendingEntry(current, entryId),
          );
          setPendingEntries(requeued);

          await syncPendingQueue();
          const remaining = await loadPendingEntries(profile.id);
          setPendingEntries(remaining);
          const selected = remaining.find((entry) => entry.id === entryId);

          if (!selected) {
            setPendingSyncMessage({ text: t(locale, 'sync.retrySucceeded'), tone: 'success' });
            await refreshVisiblePatientData();
          } else if (selected.syncState === 'failed') {
            setPendingSyncMessage({ text: t(locale, 'sync.recoveryError'), tone: 'error' });
          } else {
            setPendingSyncMessage({ text: t(locale, 'sync.retryQueued'), tone: 'success' });
          }
        } catch {
          setPendingSyncMessage({ text: t(locale, 'sync.recoveryError'), tone: 'error' });
        } finally {
          setPendingSyncBusy(null);
        }
      })();

      pendingSyncRecoveryPromiseRef.current = recoveryPromise;
      try {
        await recoveryPromise;
      } finally {
        pendingSyncRecoveryPromiseRef.current = null;
      }
    },
    [locale, profile.id, refreshVisiblePatientData, syncPendingQueue],
  );

  const discardFailedPendingSync = useCallback(
    async (entryId: string) => {
      if (pendingSyncRecoveryPromiseRef.current) {
        return pendingSyncRecoveryPromiseRef.current;
      }

      const recoveryPromise = (async () => {
        setPendingSyncBusy({ action: 'discard', entryId });
        setPendingSyncMessage(null);
        try {
          if (syncPendingPromiseRef.current) {
            await syncPendingPromiseRef.current;
          }
          const remaining = await updatePendingEntries(profile.id, (current) =>
            removePendingEntry(current, entryId),
          );
          setPendingEntries(remaining);
          setPendingSyncMessage({ text: t(locale, 'sync.discarded'), tone: 'success' });
        } catch {
          setPendingSyncMessage({ text: t(locale, 'sync.recoveryError'), tone: 'error' });
        } finally {
          setPendingSyncBusy(null);
        }
      })();

      pendingSyncRecoveryPromiseRef.current = recoveryPromise;
      try {
        await recoveryPromise;
      } finally {
        pendingSyncRecoveryPromiseRef.current = null;
      }
    },
    [locale, profile.id],
  );
  const deleteTimelineEntry = useCallback(
    async (entry: PatientEntry) => {
      const today = toLocalDateInput(new Date());
      if (
        timelineDay !== today ||
        entryLocalDay(entry) !== today ||
        offlineMode ||
        isPendingEntryId(entry.id)
      ) {
        setTimelineError(t(locale, 'entry.deleteError'));
        return;
      }

      setDeletingEntryId(entry.id);
      setTimelineError(null);
      setTimelineMessage(null);
      try {
        const result = await deletePatientEntry(client, entry.id);
        await Promise.all([
          loadTimelineDay(timelineDay, { showLoading: false }),
          loadEntries({ showLoading: false }),
        ]);
        setTimelineMessage(
          t(
            locale,
            result.photoCleanupPending ? 'entry.deletePhotoCleanupWarning' : 'entry.deleted',
          ),
        );
      } catch {
        setTimelineError(t(locale, 'entry.deleteError'));
      } finally {
        setDeletingEntryId(null);
      }
    },
    [client, entryLocalDay, loadEntries, loadTimelineDay, locale, offlineMode, timelineDay],
  );

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
      if (state === 'active') {
        setReconnectAttempt((current) => current + 1);
        void refreshVisiblePatientData();
      }
    });

    return () => subscription.remove();
  }, [refreshVisiblePatientData]);

  useEffect(() => {
    if (!offlineMode || AppState.currentState !== 'active') return;
    const retryTimer = setTimeout(() => {
      void refreshVisiblePatientData();
    }, foregroundReconnectDelayMs(reconnectAttempt));

    return () => clearTimeout(retryTimer);
  }, [offlineMode, reconnectAttempt, refreshVisiblePatientData]);

  if (showBaseline) {
    return (
      <BaselineScreen
        client={client}
        onBack={() => {
          setShowBaseline(false);
          setPatientBaseline(null);
          void loadEntries();
        }}
        onOpenSettings={() => {
          setShowBaseline(false);
          onOpenSettings();
        }}
        onOpenTimeline={() => {
          setShowBaseline(false);
          openTimeline();
        }}
        profile={profile}
      />
    );
  }

  /** Leave form without saving, then open another patient surface. */
  function cancelFormToTimeline(closeForm: () => void) {
    closeForm();
    openTimeline();
  }

  function cancelFormToProfile(closeForm: () => void) {
    closeForm();
    setShowBaseline(true);
  }

  if (showDailyForm) {
    const closeDaily = () => {
      setShowDailyForm(false);
      void loadEntries();
    };
    return (
      <DailyFormScreen
        client={client}
        onActivityAnswerChange={handleActivityAnswerChange}
        onMenstruationAnswerChange={handleMenstruationAnswerChange}
        onMedicationAnswerChange={handleMedicationAnswerChange}
        onBack={closeDaily}
        onCancelProfile={() => cancelFormToProfile(closeDaily)}
        onCancelTimeline={() => cancelFormToTimeline(closeDaily)}
        onSaved={() => {
          setShowDailyForm(false);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showFoodForm) {
    const closeFood = () => setShowFoodForm(false);
    return (
      <FoodFormScreen
        client={client}
        onBack={closeFood}
        onCancelProfile={() => cancelFormToProfile(closeFood)}
        onCancelTimeline={() => cancelFormToTimeline(closeFood)}
        onSaved={() => {
          setShowFoodForm(false);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showSymptomForm) {
    const closeSymptoms = () => setShowSymptomForm(false);
    return (
      <PatientSymptomsScreen
        client={client}
        onBack={closeSymptoms}
        onCancelProfile={() => cancelFormToProfile(closeSymptoms)}
        onCancelTimeline={() => cancelFormToTimeline(closeSymptoms)}
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
    const closeStool = () => {
      setShowStoolForm(false);
      setStoolEntryToEdit(null);
    };
    return (
      <PatientStoolScreen
        client={client}
        entryToEdit={stoolEntryToEdit}
        onBack={closeStool}
        onCancelProfile={() => cancelFormToProfile(closeStool)}
        onCancelTimeline={() => cancelFormToTimeline(closeStool)}
        onSaved={() => {
          setStoolEntryToEdit(null);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showMedicationForm) {
    const closeMedication = () => {
      setShowMedicationForm(false);
      setMedicationEntryToEdit(null);
    };
    return (
      <PatientMedicationScreen
        client={client}
        entryToEdit={medicationEntryToEdit}
        onBack={closeMedication}
        onCancelProfile={() => cancelFormToProfile(closeMedication)}
        onCancelTimeline={() => cancelFormToTimeline(closeMedication)}
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
    const closeExercise = () => {
      setShowExerciseForm(false);
      setExerciseEntryToEdit(null);
    };
    return (
      <PatientExerciseScreen
        client={client}
        entryToEdit={exerciseEntryToEdit}
        onBack={closeExercise}
        onCancelProfile={() => cancelFormToProfile(closeExercise)}
        onCancelTimeline={() => cancelFormToTimeline(closeExercise)}
        onSaved={() => {
          setExerciseCompleted(true);
          setExerciseEntryToEdit(null);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  if (showMenstruationForm && canTrackMenstruation) {
    const closePeriod = () => {
      setShowMenstruationForm(false);
      setMenstruationEntryToEdit(null);
    };
    return (
      <PatientMenstruationScreen
        client={client}
        entryToEdit={menstruationEntryToEdit}
        onBack={closePeriod}
        onCancelProfile={() => cancelFormToProfile(closePeriod)}
        onCancelTimeline={() => cancelFormToTimeline(closePeriod)}
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
    const closeNote = () => {
      setShowNoteForm(false);
      setNoteEntryToEdit(null);
    };
    return (
      <PatientNoteScreen
        client={client}
        entryToEdit={noteEntryToEdit}
        onBack={closeNote}
        onCancelProfile={() => cancelFormToProfile(closeNote)}
        onCancelTimeline={() => cancelFormToTimeline(closeNote)}
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
    const dayEntries = mergePendingTextEntries(timelineDayEntries, pendingEntries).filter(
      (entry) => entryLocalDay(entry) === timelineDay,
    );
    const pendingIds = pendingTimelineEntryIds(pendingEntries).filter((id) =>
      dayEntries.some((entry) => entry.id === id),
    );
    return (
      <PatientTimelineScreen
        client={client}
        deletingEntryId={deletingEntryId}
        entries={dayEntries}
        error={timelineError}
        loading={timelineLoading}
        message={timelineMessage}
        offlineMode={offlineMode}
        onBack={() => setShowTimeline(false)}
        onOpenBaseline={() => {
          setShowTimeline(false);
          setShowBaseline(true);
        }}
        onOpenEntry={(entry) => {
          setShowTimeline(false);
          openRecentEntry(entry);
        }}
        onDeleteEntry={deleteTimelineEntry}
        onOpenSettings={() => {
          setShowTimeline(false);
          onOpenSettings();
        }}
        onRefresh={() => loadTimelineDay(timelineDay)}
        onSelectedDayChange={handleTimelineDayChange}
        pendingEntryIds={pendingIds}
        pendingSyncBusy={pendingSyncBusy}
        pendingSyncEntries={pendingEntries}
        pendingSyncMessage={pendingSyncMessage}
        onDiscardPendingSync={discardFailedPendingSync}
        onRetryPendingSync={retryFailedPendingSync}
        selectedDay={timelineDay}
      />
    );
  }

  const dailyReadyToSubmit = Boolean(dailyEntryId && dailyMissingFields.length === 0);
  const today = toLocalDateInput(new Date());
  const todayMeals = entries.filter(
    (entry) => entry.kind === 'meal' && toLocalDateInput(new Date(entry.occurredAt)) === today,
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
    !symptomsCompleted ||
    !stoolCompleted ||
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

  const submitHelpKey = primarySubmitHelpKey({ dailyCompleted, offlineMode });
  const submitHelp = submitHelpKey
    ? t(locale, submitHelpKey)
    : (() => {
        const missingSubmitSections = [
          !dailyCompleted && !dailyReadyToSubmit ? t(locale, 'home.action.daily') : null,
          !foodCompleted ? t(locale, 'home.action.food') : null,
          !symptomsCompleted ? t(locale, 'home.action.symptoms') : null,
          !stoolCompleted ? t(locale, 'home.action.stool') : null,
          exerciseRequired && !exerciseCompleted ? t(locale, 'home.action.exercise') : null,
          medicationRequired && !medicationCompleted ? t(locale, 'home.action.medication') : null,
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
      weightReminderDueAt={patientBaseline?.weightReminderDueAt}
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
      onOpenTimeline={openTimeline}
      pendingSyncBusy={pendingSyncBusy}
      pendingSyncEntries={pendingEntries}
      pendingSyncMessage={pendingSyncMessage}
      onDiscardPendingSync={discardFailedPendingSync}
      onRetryPendingSync={retryFailedPendingSync}
      onOpenSettings={onOpenSettings}
      onSubmitDay={submitDay}
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
