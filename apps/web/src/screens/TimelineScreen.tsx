import {
  filterPatientTimelineEntries,
  isNoStoolTodayEntry,
  type EntryKind,
  type PatientEntry,
  type UserProfile,
} from '@project4/contracts';
import type { DailyFormDetails } from '@project4/contracts';
import { isCompleteDailyForm, type DailyFormDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';
import {
  completePatientDailyForm,
  deletePatientEntry,
  getPatientBaseline,
  getPatientDailyForm,
  listRecentPatientEntries,
  updateEntryTimestamp,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useCallback, useEffect, useState, type CSSProperties } from 'react';

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
  onSignOut: () => Promise<void>;
}

function toDatetimeLocal(value: Date): string {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

function localDateValue(value: Date): string {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

function sortEntries(entries: PatientEntry[]): PatientEntry[] {
  return [...entries].sort(
    (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
  );
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

function toDailyDraft(details: DailyFormDetails | null): DailyFormDraft {
  if (!details) return {};
  return {
    wakeTime: details.wakeTime ?? undefined,
    sleepDuration: details.sleepDuration ?? undefined,
    appetite: details.appetite ?? undefined,
    hadPhysicalActivity: details.hadPhysicalActivity ?? undefined,
    activityNotes: details.activityNotes ?? '',
    stressLevel: details.stressLevel ?? undefined,
    dayDescription: details.dayDescription ?? '',
    tookChronicTherapy: details.tookChronicTherapy ?? undefined,
    tookMedicationOutsideChronicTherapy: details.tookMedicationOutsideChronicTherapy ?? undefined,
    medicationOutsideChronicTherapy: details.medicationOutsideChronicTherapy ?? '',
    hadMenstruation: details.hadMenstruation ?? undefined,
    menstruationNotes: '',
    energyLevel: details.energyLevel ?? undefined,
    hadNaps: details.hadNaps ?? undefined,
    naps: details.naps ?? '',
  };
}

function greetingKey(hour: number): TranslationKey {
  if (hour < 12) return 'home.greeting.morning';
  if (hour < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

const quickActions = [
  { id: 'daily', icon: '☀', labelKey: 'home.action.daily', kind: 'daily' },
  { id: 'food', icon: '🍽', labelKey: 'home.action.food', kind: 'meal' },
  { id: 'symptoms', icon: '!', labelKey: 'home.action.symptoms', kind: 'symptom' },
  { id: 'exercise', icon: '↗', labelKey: 'home.action.exercise', kind: 'exercise' },
  { id: 'stool', icon: '◆', labelKey: 'home.action.stool', kind: 'stool' },
  { id: 'medication', icon: '+', labelKey: 'home.action.medication', kind: 'medication' },
  { id: 'period', icon: '●', labelKey: 'home.action.period', kind: 'menstruation' },
  { id: 'notes', icon: '✎', labelKey: 'home.action.notes', kind: 'note' },
] as const;

const entryIcons: Record<EntryKind, string> = {
  text: '✎',
  daily: '☀',
  meal: '🍽',
  symptom: '!',
  stool: '◆',
  medication: '+',
  exercise: '↗',
  menstruation: '●',
  note: '✎',
  custom: '□',
};

export function TimelineScreen({ client, profile, onSignOut }: TimelineScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [entries, setEntries] = useState<PatientEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTimestamp, setEditingTimestamp] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showBaseline, setShowBaseline] = useState(false);
  const [showDailyForm, setShowDailyForm] = useState(false);
  const [showSymptomForm, setShowSymptomForm] = useState(false);
  const [showStoolForm, setShowStoolForm] = useState(false);
  const [showFoodForm, setShowFoodForm] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
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
  const [showMenstruationForm, setShowMenstruationForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [canTrackMenstruation, setCanTrackMenstruation] = useState(false);

  const handleActivityAnswerChange = useCallback((answer: boolean | undefined) => {
    setExerciseRequired(answer === true);
  }, []);

  const handleMedicationAnswerChange = useCallback((answer: boolean | undefined) => {
    setMedicationRequired(answer === true);
  }, []);

  const handleMenstruationAnswerChange = useCallback((answer: boolean | undefined) => {
    setPeriodRequired(answer === true);
  }, []);

  async function loadEntries() {
    setError(null);
    try {
      const range = dayRange(localDateValue(new Date()));
      const [nextEntries, baseline, dailyForm] = await Promise.all([
        listRecentPatientEntries(client, profile.id),
        getPatientBaseline(client, profile.id),
        getPatientDailyForm(client, profile.id, range.start, range.end),
      ]);
      const nextHasChronicTherapy = Boolean(baseline?.chronicTherapy?.trim());
      const includeMenstruation = baseline?.sex === 'female';
      setEntries(filterPatientTimelineEntries(nextEntries, baseline?.sex));
      setCanTrackMenstruation(includeMenstruation);
      setDailyEntryId(dailyForm?.entryId ?? null);
      setDailyCompleted(Boolean(dailyForm?.details.completedAt));
      setDailyReadyToSubmit(
        dailyForm
          ? isCompleteDailyForm(
              toDailyDraft(dailyForm.details),
              includeMenstruation,
              nextHasChronicTherapy,
            )
          : false,
      );
      setExerciseRequired(dailyForm?.details.hadPhysicalActivity === true);
      setMedicationRequired(dailyForm?.details.tookMedicationOutsideChronicTherapy === true);
      setPeriodRequired(dailyForm?.details.hadMenstruation === true);
      setExerciseCompleted(hasTodayEntry(nextEntries, 'exercise'));
      setMedicationCompleted(hasTodayEntry(nextEntries, 'medication'));
      setPeriodCompleted(hasTodayEntry(nextEntries, 'menstruation'));
    } catch {
      setError(t(locale, 'entry.loadError'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    const range = dayRange(localDateValue(new Date()));

    void Promise.all([
      listRecentPatientEntries(client, profile.id),
      getPatientBaseline(client, profile.id),
      getPatientDailyForm(client, profile.id, range.start, range.end),
    ])
      .then(([nextEntries, baseline, dailyForm]) => {
        if (active) {
          const nextHasChronicTherapy = Boolean(baseline?.chronicTherapy?.trim());
          const includeMenstruation = baseline?.sex === 'female';
          setEntries(filterPatientTimelineEntries(nextEntries, baseline?.sex));
          setCanTrackMenstruation(includeMenstruation);
          setDailyEntryId(dailyForm?.entryId ?? null);
          setDailyCompleted(Boolean(dailyForm?.details.completedAt));
          setDailyReadyToSubmit(
            dailyForm
              ? isCompleteDailyForm(
                  toDailyDraft(dailyForm.details),
                  includeMenstruation,
                  nextHasChronicTherapy,
                )
              : false,
          );
          setExerciseRequired(dailyForm?.details.hadPhysicalActivity === true);
          setMedicationRequired(dailyForm?.details.tookMedicationOutsideChronicTherapy === true);
          setPeriodRequired(dailyForm?.details.hadMenstruation === true);
          setExerciseCompleted(hasTodayEntry(nextEntries, 'exercise'));
          setMedicationCompleted(hasTodayEntry(nextEntries, 'medication'));
          setPeriodCompleted(hasTodayEntry(nextEntries, 'menstruation'));
        }
      })
      .catch(() => {
        if (active) setError(t(locale, 'entry.loadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client, locale, profile.id]);

  async function saveTimestamp(entryId: string) {
    const parsedTimestamp = new Date(editingTimestamp);
    if (Number.isNaN(parsedTimestamp.getTime())) {
      setError(t(locale, 'entry.timestampError'));
      return;
    }

    setError(null);
    try {
      const updated = await updateEntryTimestamp(client, entryId, parsedTimestamp.toISOString());
      setEntries((current) =>
        sortEntries(current.map((entry) => (entry.id === entryId ? updated : entry))),
      );
      setEditingId(null);
      setMessage(t(locale, 'entry.updated'));
    } catch {
      setError(t(locale, 'entry.updateError'));
    }
  }

  async function removeEntry(entryId: string) {
    if (!window.confirm(t(locale, 'entry.deleteConfirm'))) return;

    setError(null);
    try {
      await deletePatientEntry(client, entryId);
      setEntries((current) => current.filter((entry) => entry.id !== entryId));
    } catch {
      setError(t(locale, 'entry.saveError'));
    }
  }

  function openEntry(entry: PatientEntry) {
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
      setShowStoolForm(true);
      return;
    }
    if (entry.kind === 'medication') {
      setShowMedicationForm(true);
      return;
    }
    if (entry.kind === 'exercise') {
      setShowExerciseForm(true);
      return;
    }
    if (entry.kind === 'menstruation') {
      setShowMenstruationForm(true);
      return;
    }
    if (entry.kind === 'note') {
      setShowNoteForm(true);
      return;
    }
    setShowTimelineList(true);
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
        profile={profile}
      />
    );
  }

  if (showStoolForm) {
    return (
      <StoolFormScreen
        client={client}
        onBack={() => setShowStoolForm(false)}
        onSaved={() => {
          setShowStoolForm(false);
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
        onBack={() => setShowMedicationForm(false)}
        onSaved={() => {
          setMedicationCompleted(true);
          setShowMedicationForm(false);
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
        onBack={() => setShowExerciseForm(false)}
        onSaved={() => {
          setExerciseCompleted(true);
          setShowExerciseForm(false);
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
        onBack={() => setShowMenstruationForm(false)}
        onSaved={() => {
          setPeriodCompleted(true);
          setShowMenstruationForm(false);
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
        onBack={() => setShowNoteForm(false)}
        onSaved={() => {
          setShowNoteForm(false);
          setMessage(t(locale, 'note.saved'));
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  const now = new Date();
  const today = localDateValue(now);
  const todayEntries = entries.filter(
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
  const completedKinds = new Set(todayEntries.map((entry) => entry.kind));
  const stoolCompleted = hasTodayEntry(entries, 'stool') || hasTodayNoStoolEntry(entries);
  const completedItems = progressActions.filter((action) => {
    if (action.id === 'daily') return dailyCompleted || dailyReadyToSubmit;
    if (action.id === 'stool') return stoolCompleted;
    return completedKinds.has(action.kind);
  }).length;
  const progress = Math.round((completedItems / Math.max(progressActions.length, 1)) * 100);
  const displayName = profile.displayName?.trim() || t(locale, 'role.patient');
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now);
  const submitDisabled =
    submittingDay ||
    dailyCompleted ||
    !dailyEntryId ||
    !dailyReadyToSubmit ||
    (exerciseRequired && !exerciseCompleted) ||
    (medicationRequired && !medicationCompleted) ||
    (periodRequired && !periodCompleted);
  const submitHelp = dailyCompleted
    ? t(locale, 'home.submitCompletedHelp')
    : !dailyEntryId
      ? t(locale, 'home.submitDailyFirst')
      : dailyReadyToSubmit
        ? t(locale, 'home.submitHelp')
        : t(locale, 'daily.statusDraftHelp');

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
          <button className="secondary-button" onClick={() => setShowBaseline(true)} type="button">
            {t(locale, 'baseline.open')}
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
            const completed =
              (action.id === 'daily' && (dailyCompleted || dailyReadyToSubmit)) ||
              (action.id === 'stool' && stoolCompleted) ||
              (action.id === 'symptoms' && completedKinds.has('symptom')) ||
              (action.id === 'food' && completedKinds.has('meal')) ||
              (action.id === 'exercise' && exerciseCompleted) ||
              (action.id === 'medication' && medicationCompleted) ||
              (action.id === 'period' && periodCompleted);
            const statusKey = completed
              ? 'home.action.completed'
              : required
                ? 'home.action.required'
                : 'home.action.optional';
            const showStatus = showsConditionalStatus || completed;
            const onClick =
              action.id === 'daily'
                ? () => setShowDailyForm(true)
                : action.id === 'food'
                  ? () => setShowFoodForm(true)
                  : action.id === 'symptoms'
                    ? () => setShowSymptomForm(true)
                    : action.id === 'exercise'
                      ? () => setShowExerciseForm(true)
                      : action.id === 'stool'
                        ? () => setShowStoolForm(true)
                        : action.id === 'medication'
                          ? () => setShowMedicationForm(true)
                          : action.id === 'period'
                            ? () => setShowMenstruationForm(true)
                            : () => setShowNoteForm(true);

            return (
              <button
                className={`web-action-card ${required ? 'required' : ''} ${
                  completed ? 'completed' : ''
                }`}
                key={action.id}
                onClick={onClick}
                type="button"
              >
                <span className="web-action-icon">{action.icon}</span>
                <strong>{t(locale, action.labelKey)}</strong>
                {showStatus ? <small>{t(locale, statusKey)}</small> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="web-home-section">
        <div className="web-section-heading">
          <h2>{t(locale, 'home.recentEntries')}</h2>
          <button
            className="text-button"
            onClick={() => setShowTimelineList((current) => !current)}
            type="button"
          >
            {t(locale, 'home.viewAll')}
          </button>
        </div>
        {loading ? <p className="empty-state">{t(locale, 'app.loading')}</p> : null}
        {!loading && todayEntries.length === 0 ? (
          <p className="empty-state">{t(locale, 'home.noEntriesToday')}</p>
        ) : null}
        <div className="web-recent-list">
          {todayEntries.slice(0, showTimelineList ? undefined : 8).map((entry) => {
            const kindLabel = t(locale, `entry.kind.${entry.kind}` as TranslationKey);
            return (
              <article className="web-recent-entry" key={entry.id}>
                <button onClick={() => openEntry(entry)} type="button">
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
                </button>
                {showTimelineList ? (
                  <div className="web-entry-actions">
                    <button
                      onClick={() => {
                        setEditingId(entry.id);
                        setEditingTimestamp(toDatetimeLocal(new Date(entry.occurredAt)));
                      }}
                      type="button"
                    >
                      {t(locale, 'common.edit')}
                    </button>
                    <button onClick={() => void removeEntry(entry.id)} type="button">
                      {t(locale, 'common.delete')}
                    </button>
                  </div>
                ) : null}
                {editingId === entry.id ? (
                  <div className="timestamp-editor">
                    <input
                      aria-label={t(locale, 'entry.time')}
                      onChange={(event) => setEditingTimestamp(event.target.value)}
                      type="datetime-local"
                      value={editingTimestamp}
                    />
                    <button
                      className="primary-button"
                      onClick={() => void saveTimestamp(entry.id)}
                      type="button"
                    >
                      {t(locale, 'common.save')}
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => setEditingId(null)}
                      type="button"
                    >
                      {t(locale, 'common.cancel')}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
