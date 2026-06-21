import type { DailyFormDetails, UserProfile } from '@project4/contracts';
import {
  dailyFormDefaults,
  hasDailyFormProgress,
  isCompleteDailyForm,
  type DailyFormDraft,
} from '@project4/forms';
import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';
import {
  getPatientBaseline,
  getPatientDailyForm,
  savePatientDailyForm,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useEffect, useState } from 'react';

import { ScreenHeader } from '../components/ScreenHeader';
import { ConditionalTextField } from '../components/ConditionalTextField';

interface DailyFormScreenProps {
  client: AppSupabaseClient;
  profile: UserProfile;
  onBack: () => void;
}

function localDateValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
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

function toDraft(details: DailyFormDetails | null): DailyFormDraft {
  if (!details) return { ...dailyFormDefaults };
  return {
    wakeTime: details.wakeTime ?? undefined,
    sleepDuration: details.sleepDuration ?? undefined,
    appetite: details.appetite ?? undefined,
    hadPhysicalActivity: details.hadPhysicalActivity ?? Boolean(details.activityNotes?.trim()),
    activityNotes: details.activityNotes ?? '',
    stressLevel: details.stressLevel ?? undefined,
    dayDescription: details.dayDescription ?? '',
    tookMedicationOutsideChronicTherapy:
      details.tookMedicationOutsideChronicTherapy ??
      Boolean(details.medicationOutsideChronicTherapy?.trim()),
    medicationOutsideChronicTherapy: details.medicationOutsideChronicTherapy ?? '',
    hadMenstruation: details.hadMenstruation ?? Boolean(details.menstruationNotes?.trim()),
    menstruationNotes: details.menstruationNotes ?? '',
    energyLevel: details.energyLevel ?? undefined,
    hadNaps: details.hadNaps ?? Boolean(details.naps?.trim()),
    naps: details.naps ?? '',
  };
}

export function DailyFormScreen({ client, profile, onBack }: DailyFormScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [day, setDay] = useState(localDateValue(new Date()));
  const [draft, setDraft] = useState<DailyFormDraft>({ ...dailyFormDefaults });
  const [existingEntryId, setExistingEntryId] = useState<string>();
  const [completedAt, setCompletedAt] = useState<string>();
  const [includeMenstruation, setIncludeMenstruation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const range = dayRange(day);

    void Promise.all([
      getPatientBaseline(client, profile.id),
      getPatientDailyForm(client, profile.id, range.start, range.end),
    ])
      .then(([baseline, record]) => {
        if (!active) return;
        setIncludeMenstruation(baseline?.sex === 'female');
        setExistingEntryId(record?.entryId);
        setCompletedAt(record?.details.completedAt ?? undefined);
        setDraft(toDraft(record?.details ?? null));
      })
      .catch(() => {
        if (active) setError(t(locale, 'daily.loadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client, day, locale, profile.id]);

  async function save(mode: 'progress' | 'complete') {
    if (mode === 'progress' && !hasDailyFormProgress(draft)) {
      setError(t(locale, 'daily.progressEmpty'));
      return;
    }
    if (mode === 'complete' && !isCompleteDailyForm(draft, includeMenstruation)) {
      setError(t(locale, 'daily.requiredError'));
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await savePatientDailyForm(
        client,
        profile.id,
        dayRange(day).occurredAt,
        draft,
        includeMenstruation,
        mode === 'complete',
        existingEntryId,
      );
      const range = dayRange(day);
      const saved = await getPatientDailyForm(client, profile.id, range.start, range.end);
      setExistingEntryId(saved?.entryId);
      setCompletedAt(saved?.details.completedAt ?? undefined);
      setDraft(toDraft(saved?.details ?? null));
      setMessage(t(locale, mode === 'complete' ? 'daily.completed' : 'daily.progressSaved'));
    } catch {
      setError(t(locale, 'daily.saveError'));
    } finally {
      setSaving(false);
    }
  }

  function textField(field: keyof DailyFormDraft, key: TranslationKey, rows = 3) {
    return (
      <label className="full-width">
        <span>{t(locale, key)}</span>
        <textarea
          onChange={(event) => setDraft((value) => ({ ...value, [field]: event.target.value }))}
          required
          rows={rows}
          value={String(draft[field] ?? '')}
        />
      </label>
    );
  }

  function scaleField(field: 'stressLevel' | 'energyLevel', key: TranslationKey) {
    return (
      <div className="full-width choice-field scale-field-card">
        <span className="choice-label" id={`${field}-label`}>
          {t(locale, key)}
        </span>
        <div
          aria-labelledby={`${field}-label`}
          className="choice-row three-options"
          role="radiogroup"
        >
          {([1, 2, 3] as const).map((level) => (
            <button
              aria-checked={draft[field] === level}
              className={draft[field] === level ? 'selected' : ''}
              key={level}
              onClick={() => setDraft((value) => ({ ...value, [field]: level }))}
              role="radio"
              type="button"
            >
              <span>{level}</span>
              <small>
                {t(
                  locale,
                  level === 1
                    ? 'daily.levelLow'
                    : level === 2
                      ? 'daily.levelModerate'
                      : 'daily.levelHigh',
                )}
              </small>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <main className="baseline-layout">
      <div className="baseline-toolbar">
        <ScreenHeader eyebrow={t(locale, 'role.patient')} title={t(locale, 'daily.title')} />
        <p className="summary">{t(locale, 'daily.subtitle')}</p>
        <button className="secondary-button" onClick={onBack} type="button">
          {t(locale, 'common.cancel')}
        </button>
      </div>

      <label className="tracked-day-field">
        <span>{t(locale, 'daily.trackedDay')}</span>
        <input
          max={localDateValue(new Date())}
          onChange={(event) => {
            setLoading(true);
            setError(null);
            setMessage(null);
            setDay(event.target.value);
          }}
          type="date"
          value={day}
        />
      </label>

      {loading ? <p className="empty-state">{t(locale, 'app.loading')}</p> : null}
      {!loading ? (
        <form className="baseline-form daily-form">
          <div className={`full-width daily-status ${completedAt ? 'complete' : 'draft'}`}>
            <strong>{t(locale, completedAt ? 'daily.statusComplete' : 'daily.statusDraft')}</strong>
            <span>
              {t(locale, completedAt ? 'daily.statusCompleteHelp' : 'daily.statusDraftHelp')}
            </span>
          </div>
          <div className="full-width time-field-row">
            <label>
              <span>{t(locale, 'daily.wakeTime')}</span>
              <input
                onChange={(event) =>
                  setDraft((value) => ({ ...value, wakeTime: event.target.value }))
                }
                required
                type="time"
                value={draft.wakeTime ?? ''}
              />
            </label>
            <label>
              <span>{t(locale, 'daily.sleepDuration')}</span>
              <input
                onChange={(event) =>
                  setDraft((value) => ({ ...value, sleepDuration: event.target.value }))
                }
                required
                step="1800"
                type="time"
                value={draft.sleepDuration ?? ''}
              />
            </label>
          </div>
          <label>
            <span>{t(locale, 'daily.appetite')}</span>
            <select
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  appetite: event.target.value as DailyFormDraft['appetite'],
                }))
              }
              required
              value={draft.appetite ?? ''}
            >
              <option disabled value="">
                —
              </option>
              {(['low', 'usual', 'high'] as const).map((appetite) => (
                <option key={appetite} value={appetite}>
                  {t(locale, `daily.appetite.${appetite}`)}
                </option>
              ))}
            </select>
          </label>
          <ConditionalTextField
            answer={draft.hadPhysicalActivity}
            detailKey="daily.activityDetails"
            id="physical-activity"
            onAnswerChange={(answer) =>
              setDraft((value) => ({
                ...value,
                hadPhysicalActivity: answer,
                activityNotes: answer ? value.activityNotes : '',
              }))
            }
            onTextChange={(text) => setDraft((value) => ({ ...value, activityNotes: text }))}
            questionKey="daily.activityNotes"
            text={draft.activityNotes ?? ''}
          />
          {scaleField('stressLevel', 'daily.stressLevel')}
          {scaleField('energyLevel', 'daily.energyLevel')}
          <ConditionalTextField
            answer={draft.tookMedicationOutsideChronicTherapy}
            detailKey="daily.medicationDetails"
            id="medication"
            onAnswerChange={(answer) =>
              setDraft((value) => ({
                ...value,
                tookMedicationOutsideChronicTherapy: answer,
                medicationOutsideChronicTherapy: answer
                  ? value.medicationOutsideChronicTherapy
                  : '',
              }))
            }
            onTextChange={(text) =>
              setDraft((value) => ({ ...value, medicationOutsideChronicTherapy: text }))
            }
            questionKey="daily.medication"
            text={draft.medicationOutsideChronicTherapy ?? ''}
          />
          {includeMenstruation ? (
            <ConditionalTextField
              answer={draft.hadMenstruation}
              detailKey="daily.menstruationDetails"
              id="menstruation"
              onAnswerChange={(answer) =>
                setDraft((value) => ({
                  ...value,
                  hadMenstruation: answer,
                  menstruationNotes: answer ? value.menstruationNotes : '',
                }))
              }
              onTextChange={(text) => setDraft((value) => ({ ...value, menstruationNotes: text }))}
              questionKey="daily.menstruation"
              text={draft.menstruationNotes ?? ''}
            />
          ) : null}
          <ConditionalTextField
            answer={draft.hadNaps}
            detailKey="daily.napsDetails"
            id="naps"
            onAnswerChange={(answer) =>
              setDraft((value) => ({
                ...value,
                hadNaps: answer,
                naps: answer ? value.naps : '',
              }))
            }
            onTextChange={(text) => setDraft((value) => ({ ...value, naps: text }))}
            questionKey="daily.naps"
            text={draft.naps ?? ''}
          />
          {textField('dayDescription', 'daily.dayDescription')}
          <div className="full-width form-actions">
            {error ? <p className="notice error">{error}</p> : null}
            {message ? <p className="notice success">{message}</p> : null}
            {completedAt ? (
              <button
                className="primary-button"
                disabled={saving}
                onClick={() => void save('complete')}
                type="button"
              >
                {t(locale, 'daily.saveChanges')}
              </button>
            ) : (
              <div className="button-row">
                <button
                  className="secondary-button"
                  disabled={saving}
                  onClick={() => void save('progress')}
                  type="button"
                >
                  {t(locale, 'daily.saveProgress')}
                </button>
                <button
                  className="primary-button"
                  disabled={saving}
                  onClick={() => void save('complete')}
                  type="button"
                >
                  {t(locale, 'daily.completeDay')}
                </button>
              </div>
            )}
          </div>
        </form>
      ) : null}
    </main>
  );
}
