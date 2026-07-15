import type { UserProfile } from '@project4/contracts';
import {
  dailyFormDefaults,
  getDailyFormMissingFields,
  hasDailyFormProgress,
  isCompleteDailyForm,
  toDailyFormDraft,
  type DailyFormDraft,
} from '@project4/forms';
import { getActiveLocale, t, type TranslationKey } from '@project4/i18n';
import {
  getPatientBaseline,
  getPatientDailyForm,
  savePatientDailyForm,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useEffect, useState } from 'react';

import { ScreenHeader } from '../components/ScreenHeader';
import { StatusMessage } from '../components/StatusMessage';
import { VoiceTextField } from '../components/VoiceTextField';

interface DailyFormScreenProps {
  client: AppSupabaseClient;
  onActivityAnswerChange: (answer: boolean | undefined) => void;
  onMedicationAnswerChange: (answer: boolean | undefined) => void;
  onMenstruationAnswerChange: (answer: boolean | undefined) => void;
  profile: UserProfile;
  onBack: () => void;
  onSaved: () => void;
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

export function DailyFormScreen({
  client,
  onActivityAnswerChange,
  onMedicationAnswerChange,
  onMenstruationAnswerChange,
  profile,
  onBack,
  onSaved,
}: DailyFormScreenProps) {
  const locale = getActiveLocale();
  const day = localDateValue(new Date());
  const [draft, setDraft] = useState<DailyFormDraft>({ ...dailyFormDefaults });
  const [existingEntryId, setExistingEntryId] = useState<string>();
  const [completedAt, setCompletedAt] = useState<string>();
  const [includeMenstruation, setIncludeMenstruation] = useState(false);
  const [hasChronicTherapy, setHasChronicTherapy] = useState(false);
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
        const nextHasChronicTherapy = Boolean(baseline?.chronicTherapy?.trim());
        setHasChronicTherapy(nextHasChronicTherapy);
        setExistingEntryId(record?.entryId);
        setCompletedAt(record?.details.completedAt ?? undefined);
        const nextDraft = toDailyFormDraft(record?.details ?? null);
        setDraft(nextDraft);
        onActivityAnswerChange(nextDraft.hadPhysicalActivity);
        onMedicationAnswerChange(nextDraft.tookMedicationOutsideChronicTherapy);
        onMenstruationAnswerChange(nextDraft.hadMenstruation);
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
  }, [
    client,
    day,
    locale,
    onActivityAnswerChange,
    onMedicationAnswerChange,
    onMenstruationAnswerChange,
    profile.id,
  ]);

  async function save(mode: 'progress' | 'complete') {
    if (mode === 'progress' && !hasDailyFormProgress(draft)) {
      setError(t(locale, 'daily.progressEmpty'));
      return;
    }
    if (
      mode === 'complete' &&
      !isCompleteDailyForm(draft, includeMenstruation, hasChronicTherapy)
    ) {
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
      setDraft(toDailyFormDraft(saved?.details ?? null));
      setMessage(t(locale, mode === 'complete' ? 'daily.completed' : 'daily.saved'));
      onSaved();
    } catch {
      setError(t(locale, 'daily.saveError'));
    } finally {
      setSaving(false);
    }
  }

  function textField(field: keyof DailyFormDraft, key: TranslationKey, rows = 3) {
    return (
      <fieldset className="structured-fieldset">
        <VoiceTextField
          label={t(locale, key)}
          value={String(draft[field] ?? '')}
          onChange={(val) => setDraft((value) => ({ ...value, [field]: val }))}
          rows={rows}
          type="textarea"
        />
      </fieldset>
    );
  }

  function scaleField(field: 'stressLevel' | 'energyLevel', key: TranslationKey) {
    return (
      <fieldset className="structured-fieldset scale-field-card">
        <legend>{t(locale, key)}</legend>
        <div className="choice-row three-options" role="radiogroup">
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
      </fieldset>
    );
  }

  function optionField<T extends string>({
    id,
    labelKey,
    onChange,
    options,
    value,
  }: {
    id: string;
    labelKey: TranslationKey;
    onChange: (value: T) => void;
    options: Array<{ value: T; label: string }>;
    value: T | undefined;
  }) {
    return (
      <fieldset className="structured-fieldset daily-option-field">
        <legend>{t(locale, labelKey)}</legend>
        <div className="choice-row three-options" role="radiogroup">
          {options.map((option) => (
            <button
              aria-checked={value === option.value}
              className={value === option.value ? 'selected' : ''}
              key={option.value}
              onClick={() => onChange(option.value)}
              role="radio"
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
    );
  }

  const showDraftStatus = Boolean(existingEntryId && !completedAt && hasDailyFormProgress(draft));

  return (
    <main className="baseline-layout structured-entry-layout">
      <div className="baseline-toolbar">
        <ScreenHeader eyebrow={t(locale, 'role.patient')} title={t(locale, 'daily.title')} />
        <p className="summary">{t(locale, 'daily.subtitle')}</p>
      </div>

      {loading ? <p className="empty-state">{t(locale, 'app.loading')}</p> : null}
      {!loading ? (
        <form className="structured-entry-form daily-form">
          {completedAt || showDraftStatus ? (
            <div
              className={`daily-status ${completedAt ? 'complete' : 'draft'} ${showDraftStatus ? 'centered' : ''}`}
            >
              <strong>
                {completedAt ? t(locale, 'daily.statusComplete') : t(locale, 'daily.statusDraft')}
              </strong>
              {completedAt ? <span>{t(locale, 'daily.statusCompleteHelp')}</span> : null}
            </div>
          ) : null}
          <fieldset className="structured-fieldset">
            <legend>{t(locale, 'daily.sleepNotes')}</legend>
            <div className="time-field-row">
              <label>
                <span>{t(locale, 'daily.wakeTime')}</span>
                <input
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      wakeTime: event.target.value,
                    }))
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
                    setDraft((value) => ({
                      ...value,
                      sleepDuration: event.target.value,
                    }))
                  }
                  required
                  type="time"
                  value={draft.sleepDuration ?? ''}
                />
              </label>
            </div>
          </fieldset>
          {optionField({
            id: 'appetite',
            labelKey: 'daily.appetite',
            onChange: (appetite: NonNullable<DailyFormDraft['appetite']>) =>
              setDraft((value) => ({ ...value, appetite })),
            options: (['low', 'usual', 'high'] as const).map((appetite) => ({
              value: appetite,
              label: t(locale, `daily.appetite.${appetite}`),
            })),
            value: draft.appetite,
          })}
          <fieldset className="structured-fieldset activity-choice">
            <legend>{t(locale, 'daily.activityNotes')}</legend>
            <div className="choice-row" role="radiogroup">
              {([true, false] as const).map((answer) => (
                <button
                  aria-checked={draft.hadPhysicalActivity === answer}
                  className={draft.hadPhysicalActivity === answer ? 'selected' : ''}
                  key={String(answer)}
                  onClick={() => {
                    setDraft((value) => ({
                      ...value,
                      hadPhysicalActivity: answer,
                      activityNotes: '',
                    }));
                    onActivityAnswerChange(answer);
                  }}
                  role="radio"
                  type="button"
                >
                  {t(locale, answer ? 'common.yes' : 'common.no')}
                </button>
              ))}
            </div>
            {draft.hadPhysicalActivity ? (
              <p className="exercise-requirement">{t(locale, 'daily.exerciseRequiredHelp')}</p>
            ) : null}
          </fieldset>
          {scaleField('stressLevel', 'daily.stressLevel')}
          {scaleField('energyLevel', 'daily.energyLevel')}
          <fieldset
            className={`structured-fieldset conditional-question ${
              hasChronicTherapy ? '' : 'disabled'
            }`}
          >
            <legend>{t(locale, 'daily.chronicTherapyTaken')}</legend>
            <div className="choice-row" role="radiogroup">
              {([true, false] as const).map((answer) => {
                const chronicTherapyAnswer = hasChronicTherapy ? draft.tookChronicTherapy : false;

                return (
                  <button
                    aria-checked={chronicTherapyAnswer === answer}
                    className={chronicTherapyAnswer === answer ? 'selected' : ''}
                    disabled={!hasChronicTherapy}
                    key={String(answer)}
                    onClick={() => setDraft((value) => ({ ...value, tookChronicTherapy: answer }))}
                    role="radio"
                    type="button"
                  >
                    {t(locale, answer ? 'common.yes' : 'common.no')}
                  </button>
                );
              })}
            </div>
            {!hasChronicTherapy ? <p>{t(locale, 'daily.noChronicTherapyHelp')}</p> : null}
          </fieldset>
          <fieldset className="structured-fieldset conditional-question">
            <legend>{t(locale, 'daily.medication')}</legend>
            <div className="choice-row" role="radiogroup">
              {([true, false] as const).map((answer) => (
                <button
                  aria-checked={draft.tookMedicationOutsideChronicTherapy === answer}
                  className={draft.tookMedicationOutsideChronicTherapy === answer ? 'selected' : ''}
                  key={String(answer)}
                  onClick={() => {
                    setDraft((value) => ({
                      ...value,
                      tookMedicationOutsideChronicTherapy: answer,
                      medicationOutsideChronicTherapy: '',
                    }));
                    onMedicationAnswerChange(answer);
                  }}
                  role="radio"
                  type="button"
                >
                  {t(locale, answer ? 'common.yes' : 'common.no')}
                </button>
              ))}
            </div>
            {draft.tookMedicationOutsideChronicTherapy ? (
              <p className="exercise-requirement">{t(locale, 'daily.medicationRequiredHelp')}</p>
            ) : null}
          </fieldset>
          {includeMenstruation ? (
            <fieldset className="structured-fieldset conditional-question">
              <legend>{t(locale, 'daily.menstruation')}</legend>
              <div className="choice-row" role="radiogroup">
                {([true, false] as const).map((answer) => (
                  <button
                    aria-checked={draft.hadMenstruation === answer}
                    className={draft.hadMenstruation === answer ? 'selected' : ''}
                    key={String(answer)}
                    onClick={() => {
                      setDraft((value) => ({
                        ...value,
                        hadMenstruation: answer,
                        menstruationNotes: '',
                      }));
                      onMenstruationAnswerChange(answer);
                    }}
                    role="radio"
                    type="button"
                  >
                    {t(locale, answer ? 'common.yes' : 'common.no')}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}
          <fieldset className="structured-fieldset conditional-question">
            <legend>{t(locale, 'daily.naps')}</legend>
            <div className="choice-row" role="radiogroup">
              {([true, false] as const).map((answer) => (
                <button
                  aria-checked={draft.hadNaps === answer}
                  className={draft.hadNaps === answer ? 'selected' : ''}
                  key={String(answer)}
                  onClick={() =>
                    setDraft((value) => ({
                      ...value,
                      hadNaps: answer,
                      naps: answer ? value.naps : '',
                    }))
                  }
                  role="radio"
                  type="button"
                >
                  {t(locale, answer ? 'common.yes' : 'common.no')}
                </button>
              ))}
            </div>
            {draft.hadNaps ? (
              <div className="conditional-field-bubble">
                <VoiceTextField
                  label={t(locale, 'daily.napsDetails')}
                  onChange={(val) => setDraft((value) => ({ ...value, naps: val }))}
                  required
                  rows={3}
                  type="textarea"
                  value={draft.naps ?? ''}
                />
              </div>
            ) : null}
          </fieldset>
          {textField('dayDescription', 'daily.dayDescription')}
          <div className="form-actions">
            {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
            {message ? <StatusMessage tone="success">{message}</StatusMessage> : null}
            <button className="secondary-button" onClick={onBack} type="button">
              {t(locale, 'common.cancel')}
            </button>
            <button
              className="primary-button"
              disabled={saving}
              onClick={() => void save('progress')}
              type="button"
            >
              {t(locale, 'common.save')}
            </button>
          </div>
        </form>
      ) : null}
    </main>
  );
}
