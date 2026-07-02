import { exerciseIntensities, type ExerciseRecord, type UserProfile } from '@project4/contracts';
import { exerciseDraftDefaults, validateExercise, type ExerciseDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';
import {
  createPatientExercise,
  getPatientExercise,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useEffect, useState, type FormEvent } from 'react';

import { ScreenHeader } from '../components/ScreenHeader';

interface ExerciseFormScreenProps {
  client: AppSupabaseClient;
  entryToEdit?: { id: string; occurredAt: string } | null;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

function toDatetimeLocal(value: Date): string {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

function toDraft(record: ExerciseRecord): ExerciseDraft {
  return {
    entryId: record.entryId,
    activity: record.activity,
    durationMinutes: record.durationMinutes,
    intensity: record.intensity,
    occurredAt: toDatetimeLocal(new Date(record.occurredAt)),
    notes: record.notes ?? '',
  };
}

export function ExerciseFormScreen({
  client,
  entryToEdit,
  onBack,
  onSaved,
  profile,
}: ExerciseFormScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [draft, setDraft] = useState<ExerciseDraft>({
    ...exerciseDraftDefaults,
    occurredAt: toDatetimeLocal(new Date()),
  });
  const [loading, setLoading] = useState(Boolean(entryToEdit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entryToEdit) {
      setDraft({ ...exerciseDraftDefaults, occurredAt: toDatetimeLocal(new Date()) });
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    void getPatientExercise(client, entryToEdit.id, entryToEdit.occurredAt)
      .then((record) => {
        if (!active) return;
        if (!record) {
          setError(t(locale, 'exercise.loadError'));
          return;
        }
        setDraft(toDraft(record));
      })
      .catch(() => {
        if (active) setError(t(locale, 'exercise.loadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client, entryToEdit, locale]);

  function update<K extends keyof ExerciseDraft>(field: K, value: ExerciseDraft[K]) {
    setError(null);
    setDraft((current) => ({ ...current, [field]: value }));
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
      await createPatientExercise(client, profile.id, draft);
      onSaved();
    } catch {
      setError(t(locale, 'exercise.saveError'));
    } finally {
      setSaving(false);
    }
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
      {!loading ? (
      <form className="structured-entry-form" onSubmit={(event) => void submit(event)}>
        <fieldset className="structured-fieldset">
          <legend>{t(locale, 'exercise.activity')}</legend>
          <input
            aria-label={t(locale, 'exercise.activity')}
            autoComplete="off"
            onChange={(event) => update('activity', event.target.value)}
            placeholder={t(locale, 'exercise.activityPlaceholder')}
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

        <fieldset className="structured-fieldset">
          <legend>{t(locale, 'exercise.date')}</legend>
          <input
            aria-label={t(locale, 'exercise.date')}
            onChange={(event) => update('occurredAt', event.target.value)}
            type="datetime-local"
            value={draft.occurredAt ?? ''}
          />
        </fieldset>
        <fieldset className="structured-fieldset">
          <legend>{t(locale, 'exercise.notes')}</legend>
          <textarea
            aria-label={t(locale, 'exercise.notes')}
            onChange={(event) => update('notes', event.target.value)}
            placeholder={t(locale, 'exercise.notesPlaceholder')}
            rows={4}
            value={draft.notes ?? ''}
          />
        </fieldset>

        {error ? <p className="notice error">{error}</p> : null}
        <div className="button-row form-actions-row">
          <button className="secondary-button" onClick={onBack} type="button">
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
