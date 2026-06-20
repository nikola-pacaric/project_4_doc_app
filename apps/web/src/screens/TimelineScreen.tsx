import {
  filterPatientTimelineEntries,
  type PatientEntry,
  type UserProfile,
} from '@project4/contracts';
import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';
import {
  createTextEntry,
  deletePatientEntry,
  getPatientBaseline,
  listRecentPatientEntries,
  updateEntryTimestamp,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useEffect, useState, type FormEvent } from 'react';

import { ScreenHeader } from '../components/ScreenHeader';
import { BaselineScreen } from './BaselineScreen';
import { DailyFormScreen } from './DailyFormScreen';
import { ExerciseFormScreen } from './ExerciseFormScreen';
import { MedicationFormScreen } from './MedicationFormScreen';
import { MenstruationFormScreen } from './MenstruationFormScreen';
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

function sortEntries(entries: PatientEntry[]): PatientEntry[] {
  return [...entries].sort(
    (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
  );
}

export function TimelineScreen({ client, profile, onSignOut }: TimelineScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [entries, setEntries] = useState<PatientEntry[]>([]);
  const [text, setText] = useState('');
  const [occurredAt, setOccurredAt] = useState(toDatetimeLocal(new Date()));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTimestamp, setEditingTimestamp] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showBaseline, setShowBaseline] = useState(false);
  const [showDailyForm, setShowDailyForm] = useState(false);
  const [showSymptomForm, setShowSymptomForm] = useState(false);
  const [showStoolForm, setShowStoolForm] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [showMenstruationForm, setShowMenstruationForm] = useState(false);
  const [canTrackMenstruation, setCanTrackMenstruation] = useState(false);

  async function loadEntries() {
    setError(null);
    try {
      const [nextEntries, baseline] = await Promise.all([
        listRecentPatientEntries(client, profile.id),
        getPatientBaseline(client, profile.id),
      ]);
      setEntries(filterPatientTimelineEntries(nextEntries, baseline?.sex));
      setCanTrackMenstruation(baseline?.sex === 'female');
    } catch {
      setError(t(locale, 'entry.loadError'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    void Promise.all([
      listRecentPatientEntries(client, profile.id),
      getPatientBaseline(client, profile.id),
    ])
      .then(([nextEntries, baseline]) => {
        if (active) {
          setEntries(filterPatientTimelineEntries(nextEntries, baseline?.sex));
          setCanTrackMenstruation(baseline?.sex === 'female');
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsedTimestamp = new Date(occurredAt);
    if (!text.trim() || Number.isNaN(parsedTimestamp.getTime())) {
      setError(!text.trim() ? t(locale, 'entry.textRequired') : t(locale, 'entry.timestampError'));
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const entry = await createTextEntry(client, profile.id, text, parsedTimestamp.toISOString());
      setEntries((current) => sortEntries([entry, ...current]));
      setText('');
      setOccurredAt(toDatetimeLocal(new Date()));
      setMessage(t(locale, 'entry.saved'));
    } catch {
      setError(t(locale, 'entry.saveError'));
    } finally {
      setBusy(false);
    }
  }

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
      <DailyFormScreen client={client} onBack={() => setShowDailyForm(false)} profile={profile} />
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
          setShowMenstruationForm(false);
          void loadEntries();
        }}
        profile={profile}
      />
    );
  }

  return (
    <main className="timeline-layout">
      <div className="timeline-toolbar">
        <ScreenHeader
          eyebrow={profile.displayName ?? t(locale, 'role.patient')}
          title={t(locale, 'timeline.title')}
        />
        <div className="button-row compact">
          <button
            className="secondary-button"
            onClick={() => setShowSymptomForm(true)}
            type="button"
          >
            {t(locale, 'symptom.open')}
          </button>
          <button className="secondary-button" onClick={() => setShowStoolForm(true)} type="button">
            {t(locale, 'stool.open')}
          </button>
          <button
            className="secondary-button"
            onClick={() => setShowMedicationForm(true)}
            type="button"
          >
            {t(locale, 'medication.open')}
          </button>
          <button
            className="secondary-button"
            onClick={() => setShowExerciseForm(true)}
            type="button"
          >
            {t(locale, 'exercise.open')}
          </button>
          {canTrackMenstruation ? (
            <button
              className="secondary-button"
              onClick={() => setShowMenstruationForm(true)}
              type="button"
            >
              {t(locale, 'menstruation.open')}
            </button>
          ) : null}
          <button className="secondary-button" onClick={() => setShowDailyForm(true)} type="button">
            {t(locale, 'daily.open')}
          </button>
          <button className="secondary-button" onClick={() => setShowBaseline(true)} type="button">
            {t(locale, 'baseline.open')}
          </button>
          <button className="secondary-button" onClick={() => void loadEntries()} type="button">
            {t(locale, 'timeline.refresh')}
          </button>
          <button className="secondary-button" onClick={() => void onSignOut()} type="button">
            {t(locale, 'auth.signOut')}
          </button>
        </div>
      </div>

      <section className="entry-workspace">
        <form className="entry-composer" onSubmit={(event) => void submit(event)}>
          <label>
            <span>{t(locale, 'entry.placeholder')}</span>
            <textarea
              onChange={(event) => setText(event.target.value)}
              placeholder={t(locale, 'entry.placeholder')}
              required
              rows={5}
              value={text}
            />
          </label>
          <label>
            <span>{t(locale, 'entry.time')}</span>
            <input
              onChange={(event) => setOccurredAt(event.target.value)}
              required
              type="datetime-local"
              value={occurredAt}
            />
          </label>
          <button className="primary-button" disabled={busy} type="submit">
            {t(locale, 'entry.create')}
          </button>
          {error ? <p className="notice error">{error}</p> : null}
          {message ? <p className="notice success">{message}</p> : null}
        </form>

        <div className="timeline-list">
          {loading ? <p className="empty-state">{t(locale, 'app.loading')}</p> : null}
          {!loading && entries.length === 0 ? (
            <p className="empty-state">{t(locale, 'entry.empty')}</p>
          ) : null}
          {entries.map((entry) => (
            <article className="entry-card" key={entry.id}>
              <div className="entry-card-header">
                <time dateTime={entry.occurredAt}>
                  {new Intl.DateTimeFormat('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(entry.occurredAt))}
                </time>
                <div className="text-actions">
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
              </div>
              <p>{entry.text ?? t(locale, `entry.kind.${entry.kind}` as TranslationKey)}</p>
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
          ))}
        </div>
      </section>
    </main>
  );
}
