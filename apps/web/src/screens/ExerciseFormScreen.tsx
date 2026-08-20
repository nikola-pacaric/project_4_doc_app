import { exerciseIntensities, type ExerciseRecord, type UserProfile } from '@project4/contracts';
import { researchCalendarDateTime } from '@project4/contracts';
import { exerciseDraftDefaults, validateExercise, type ExerciseDraft } from '@project4/forms';
import { getActiveLocale, t, type TranslationKey } from '@project4/i18n';
import {
  createPatientExercise,
  getPatientExercise,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useEffect, useState, type FormEvent } from 'react';

import { ScreenHeader } from '../components/ScreenHeader';
import { StatusMessage } from '../components/StatusMessage';
import { VoiceTextField } from '../components/VoiceTextField';

interface ExerciseFormScreenProps {
  client: AppSupabaseClient;
  entryToEdit?: { id: string; occurredAt: string } | null;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

function toLocalDateTime(value: Date): string {
  return researchCalendarDateTime(value, ' ');
}

function toDraft(record: ExerciseRecord): ExerciseDraft {
  return {
    entryId: record.entryId,
    activity: record.activity,
    durationMinutes: record.durationMinutes,
    intensity: record.intensity,
    occurredAt: toLocalDateTime(new Date(record.occurredAt)),
    notes: record.notes ?? '',
  };
}

function createInitialDraft(): ExerciseDraft {
  return {
    ...exerciseDraftDefaults,
    occurredAt: toLocalDateTime(new Date()),
  };
}

export function ExerciseFormScreen({ entryToEdit, ...props }: ExerciseFormScreenProps) {
  return (
    <ExerciseFormContent
      key={entryToEdit ? `${entryToEdit.id}:${entryToEdit.occurredAt}` : 'new'}
      entryToEdit={entryToEdit}
      {...props}
    />
  );
}

function ExerciseFormContent({
  client,
  entryToEdit,
  onBack,
  onSaved,
  profile,
}: ExerciseFormScreenProps) {
  const locale = getActiveLocale();
  const [draft, setDraft] = useState<ExerciseDraft>(createInitialDraft);
  const [loading, setLoading] = useState(Boolean(entryToEdit));
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedExercise, setSavedExercise] = useState<ExerciseRecord | null>(null);

  useEffect(() => {
    if (!entryToEdit) return;

    let active = true;
    void getPatientExercise(client, entryToEdit.id, entryToEdit.occurredAt)
      .then((record) => {
        if (!active) return;
        if (!record) {
          setError(t(locale, 'exercise.loadError'));
          setLoadFailed(true);
          return;
        }
        setDraft(toDraft(record));
      })
      .catch(() => {
        if (!active) return;
        setLoadFailed(true);
        setError(t(locale, 'exercise.loadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client, entryToEdit, loadAttempt, locale]);

  function retryLoad() {
    setLoading(true);
    setLoadFailed(false);
    setError(null);
    setLoadAttempt((current) => current + 1);
  }

  function update<K extends keyof ExerciseDraft>(field: K, value: ExerciseDraft[K]) {
    setError(null);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateDateTime(date: string, time: string) {
    update('occurredAt', `${date} ${time}`);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validateExercise(draft).valid) {
      setError(t(locale, 'exercise.requiredError'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const saved = await createPatientExercise(client, profile.id, draft);
      setSavedExercise(saved);
    } catch {
      setError(t(locale, 'exercise.saveError'));
    } finally {
      setSaving(false);
    }
  }

  const date = draft.occurredAt?.slice(0, 10) ?? '';
  const time = draft.occurredAt?.slice(11, 16) ?? '';

  if (savedExercise) {
    return (
      <main className="baseline-layout structured-entry-layout">
        <section className="save-confirmation-card">
          <div className="save-confirmation-icon">✓</div>
          <h1>{t(locale, 'exercise.savedTitle')}</h1>
          <strong>{savedExercise.activity}</strong>
          <p>{t(locale, 'exercise.savedDetail')}</p>
          <div className="button-row form-actions-row">
            <button
              className="primary-button"
              onClick={() => {
                setSavedExercise(null);
                setDraft(createInitialDraft());
              }}
              type="button"
            >
              {t(locale, 'exercise.addAnother')}
            </button>
            <button className="secondary-button" onClick={onSaved} type="button">
              {t(locale, 'exercise.done')}
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="baseline-layout structured-entry-layout">
      <div className="baseline-toolbar">
        <ScreenHeader
          eyebrow={t(locale, 'role.patient')}
          subtitle={t(locale, 'exercise.subtitle')}
          title={t(locale, 'exercise.title')}
        />
      </div>

      {loading ? <p className="empty-state">{t(locale, 'app.loading')}</p> : null}
      {!loading && loadFailed ? (
        <section className="structured-entry-form">
          <StatusMessage tone="error">{error ?? t(locale, 'exercise.loadError')}</StatusMessage>
          <div className="button-row form-actions-row">
            <button className="secondary-button" onClick={onBack} type="button">
              {t(locale, 'common.cancel')}
            </button>
            <button className="primary-button" onClick={retryLoad} type="button">
              {t(locale, 'common.retry')}
            </button>
          </div>
        </section>
      ) : null}
      {!loading && !loadFailed ? (
        <form className="structured-entry-form" onSubmit={(event) => void submit(event)}>
          <fieldset className="structured-fieldset">
            <VoiceTextField
              label={t(locale, 'exercise.activity')}
              onChange={(value) => update('activity', value)}
              placeholder={t(locale, 'exercise.activityPlaceholder')}
              type="text"
              value={draft.activity ?? ''}
            />
          </fieldset>

          <fieldset className="structured-fieldset">
            <legend>{t(locale, 'exercise.duration')}</legend>
            <input
              aria-label={t(locale, 'exercise.duration')}
              inputMode="numeric"
              max={1440}
              min={1}
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                update('durationMinutes', Number.isFinite(value) ? value : undefined);
              }}
              placeholder={t(locale, 'exercise.durationPlaceholder')}
              step={1}
              type="number"
              value={draft.durationMinutes ?? ''}
            />
          </fieldset>

          <fieldset className="structured-fieldset">
            <legend>{t(locale, 'exercise.intensity')}</legend>
            <div className="choice-row three-options" role="radiogroup">
              {exerciseIntensities.map((intensity) => (
                <button
                  aria-checked={draft.intensity === intensity}
                  className={draft.intensity === intensity ? 'selected' : ''}
                  key={intensity}
                  onClick={() => update('intensity', intensity)}
                  role="radio"
                  type="button"
                >
                  {t(locale, `exercise.intensity.${intensity}` as TranslationKey)}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="baseline-field-pair">
            <fieldset className="structured-fieldset">
              <legend>{t(locale, 'exercise.date')}</legend>
              <input aria-label={t(locale, 'exercise.date')} readOnly value={date} />
            </fieldset>
            <fieldset className="structured-fieldset">
              <legend>{t(locale, 'exercise.time')}</legend>
              <input
                aria-label={t(locale, 'exercise.time')}
                onChange={(event) => updateDateTime(date, event.target.value)}
                placeholder={t(locale, 'exercise.timePlaceholder')}
                type="time"
                value={time}
              />
            </fieldset>
          </div>
          <fieldset className="structured-fieldset">
            <VoiceTextField
              label={t(locale, 'exercise.notes')}
              onChange={(value) => update('notes', value)}
              placeholder={t(locale, 'exercise.notesPlaceholder')}
              rows={4}
              type="textarea"
              value={draft.notes ?? ''}
            />
          </fieldset>

          {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
          <div className="button-row form-actions-row">
            <button className="secondary-button" disabled={saving} onClick={onBack} type="button">
              {t(locale, 'common.cancel')}
            </button>
            <button className="primary-button" disabled={saving} type="submit">
              {t(locale, 'exercise.save')}
            </button>
          </div>
        </form>
      ) : null}
    </main>
  );
}
