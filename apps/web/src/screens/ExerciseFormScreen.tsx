import { exerciseIntensities, type UserProfile } from '@project4/contracts';
import { exerciseDraftDefaults, validateExercise, type ExerciseDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';
import { createPatientExercise, type AppSupabaseClient } from '@project4/supabase-client';
import { useState, type FormEvent } from 'react';

import { ScreenHeader } from '../components/ScreenHeader';

interface ExerciseFormScreenProps {
  client: AppSupabaseClient;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

function toDatetimeLocal(value: Date): string {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

export function ExerciseFormScreen({ client, onBack, onSaved, profile }: ExerciseFormScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [draft, setDraft] = useState<ExerciseDraft>({
    ...exerciseDraftDefaults,
    occurredAt: toDatetimeLocal(new Date()),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <button className="secondary-button" onClick={onBack} type="button">
          {t(locale, 'common.cancel')}
        </button>
      </div>

      <form className="structured-entry-form" onSubmit={(event) => void submit(event)}>
        <div className="exercise-field-grid">
          <label>
            <span>{t(locale, 'exercise.activity')}</span>
            <input
              autoComplete="off"
              onChange={(event) => update('activity', event.target.value)}
              placeholder={t(locale, 'exercise.activityPlaceholder')}
              value={draft.activity ?? ''}
            />
          </label>
          <label>
            <span>{t(locale, 'exercise.duration')}</span>
            <input
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
          </label>
        </div>

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

        <label>
          <span>{t(locale, 'exercise.date')}</span>
          <input
            onChange={(event) => update('occurredAt', event.target.value)}
            type="datetime-local"
            value={draft.occurredAt ?? ''}
          />
        </label>
        <label>
          <span>{t(locale, 'exercise.notes')}</span>
          <textarea
            onChange={(event) => update('notes', event.target.value)}
            placeholder={t(locale, 'exercise.notesPlaceholder')}
            rows={4}
            value={draft.notes ?? ''}
          />
        </label>

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
    </main>
  );
}
