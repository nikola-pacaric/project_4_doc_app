import type { PatientBaselineProfile, PatientSex, UserProfile } from '@project4/contracts';
import {
  baselineProfileDefaults,
  isCompleteBaselineProfile,
  parseRecentMajorWeightChange,
  type BaselineProfileDraft,
} from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import {
  getPatientBaseline,
  savePatientBaseline,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useEffect, useState, type FormEvent } from 'react';

import { ScreenHeader } from '../components/ScreenHeader';

interface BaselineScreenProps {
  client: AppSupabaseClient;
  profile: UserProfile;
  onBack: () => void;
}

const sexOptions: Array<{ value: PatientSex; key: Parameters<typeof t>[1] }> = [
  { value: 'female', key: 'baseline.sexFemale' },
  { value: 'male', key: 'baseline.sexMale' },
  { value: 'other', key: 'baseline.sexOther' },
  { value: 'prefer_not_to_say', key: 'baseline.sexPreferNot' },
];

function toDraft(current: PatientBaselineProfile | null): BaselineProfileDraft {
  if (!current) return { ...baselineProfileDefaults };
  return {
    sex: current.sex ?? undefined,
    birthYear: current.birthYear ?? undefined,
    occupation: current.occupation ?? '',
    chronicDiseases: current.chronicDiseases ?? '',
    chronicTherapy: current.chronicTherapy ?? '',
    menstrualHistory: current.menstrualHistory ?? '',
    weightKg: current.weightKg ?? undefined,
    heightCm: current.heightCm ?? undefined,
    ...parseRecentMajorWeightChange(current.recentMajorWeightChange),
  };
}

function optionalNumber(value: string): number | undefined {
  return value === '' ? undefined : Number(value);
}

export function BaselineScreen({ client, profile, onBack }: BaselineScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [current, setCurrent] = useState<PatientBaselineProfile | null>(null);
  const [draft, setDraft] = useState<BaselineProfileDraft>({ ...baselineProfileDefaults });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getPatientBaseline(client, profile.id)
      .then((loaded) => {
        if (!active) return;
        setCurrent(loaded);
        setDraft(toDraft(loaded));
      })
      .catch(() => {
        if (active) setError(t(locale, 'baseline.loadError'));
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
    if (!isCompleteBaselineProfile(draft)) {
      setError(t(locale, 'baseline.requiredError'));
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await savePatientBaseline(client, profile.id, draft, current);
      setCurrent(saved);
      setDraft(toDraft(saved));
      setMessage(t(locale, 'baseline.saved'));
    } catch {
      setError(t(locale, 'baseline.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="baseline-layout">
      <div className="baseline-toolbar">
        <ScreenHeader eyebrow={t(locale, 'role.patient')} title={t(locale, 'baseline.title')} />
        <p className="summary">{t(locale, 'baseline.subtitle')}</p>
        <button className="secondary-button" onClick={onBack} type="button">
          {t(locale, 'common.cancel')}
        </button>
      </div>

      {loading ? <p className="empty-state">{t(locale, 'app.loading')}</p> : null}
      {!loading ? (
        <form className="baseline-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>{t(locale, 'baseline.sex')}</span>
            <select
              onChange={(event) =>
                setDraft((value) => ({ ...value, sex: event.target.value as PatientSex }))
              }
              required
              value={draft.sex ?? ''}
            >
              <option disabled value="">
                —
              </option>
              {sexOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(locale, option.key)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t(locale, 'baseline.birthYear')}</span>
            <input
              max={new Date().getFullYear()}
              min="1900"
              onChange={(event) =>
                setDraft((value) => ({ ...value, birthYear: optionalNumber(event.target.value) }))
              }
              required
              type="number"
              value={draft.birthYear ?? ''}
            />
          </label>
          <label className="full-width">
            <span>{t(locale, 'baseline.occupation')}</span>
            <input
              onChange={(event) =>
                setDraft((value) => ({ ...value, occupation: event.target.value }))
              }
              required
              value={draft.occupation ?? ''}
            />
          </label>
          <label>
            <span>{t(locale, 'baseline.weightKg')}</span>
            <input
              max="500"
              min="0.1"
              onChange={(event) =>
                setDraft((value) => ({ ...value, weightKg: optionalNumber(event.target.value) }))
              }
              required
              step="0.1"
              type="number"
              value={draft.weightKg ?? ''}
            />
          </label>
          <label>
            <span>{t(locale, 'baseline.heightCm')}</span>
            <input
              max="250"
              min="50"
              onChange={(event) =>
                setDraft((value) => ({ ...value, heightCm: optionalNumber(event.target.value) }))
              }
              required
              step="0.1"
              type="number"
              value={draft.heightCm ?? ''}
            />
          </label>
          <div className="full-width choice-field">
            <span className="choice-label" id="recent-weight-change-label">
              {t(locale, 'baseline.recentWeightChange')}
            </span>
            <div
              aria-labelledby="recent-weight-change-label"
              className="choice-row"
              role="radiogroup"
            >
              {(['yes', 'no'] as const).map((answer) => (
                <button
                  aria-checked={draft.recentMajorWeightChange === answer}
                  className={draft.recentMajorWeightChange === answer ? 'selected' : ''}
                  key={answer}
                  onClick={() =>
                    setDraft((value) => ({
                      ...value,
                      recentMajorWeightChange: answer,
                      recentMajorWeightChangeDescription:
                        answer === 'no' ? '' : value.recentMajorWeightChangeDescription,
                    }))
                  }
                  role="radio"
                  type="button"
                >
                  {t(locale, answer === 'yes' ? 'common.yes' : 'common.no')}
                </button>
              ))}
            </div>
          </div>
          {draft.recentMajorWeightChange === 'yes' ? (
            <div className="full-width conditional-field-bubble">
              <label>
                <span>{t(locale, 'baseline.recentWeightChangeDescription')}</span>
                <textarea
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      recentMajorWeightChangeDescription: event.target.value,
                    }))
                  }
                  required
                  rows={3}
                  value={draft.recentMajorWeightChangeDescription ?? ''}
                />
              </label>
            </div>
          ) : null}
          <label className="full-width">
            <span>{t(locale, 'baseline.chronicDiseases')}</span>
            <textarea
              onChange={(event) =>
                setDraft((value) => ({ ...value, chronicDiseases: event.target.value }))
              }
              rows={3}
              value={draft.chronicDiseases ?? ''}
            />
          </label>
          <label className="full-width">
            <span>{t(locale, 'baseline.chronicTherapy')}</span>
            <textarea
              onChange={(event) =>
                setDraft((value) => ({ ...value, chronicTherapy: event.target.value }))
              }
              rows={3}
              value={draft.chronicTherapy ?? ''}
            />
          </label>
          {draft.sex === 'female' ? (
            <label className="full-width">
              <span>{t(locale, 'baseline.menstrualHistory')}</span>
              <textarea
                onChange={(event) =>
                  setDraft((value) => ({ ...value, menstrualHistory: event.target.value }))
                }
                rows={3}
                value={draft.menstrualHistory ?? ''}
              />
            </label>
          ) : null}
          <div className="full-width form-actions">
            <button className="primary-button" disabled={saving} type="submit">
              {t(locale, 'common.save')}
            </button>
            {error ? <p className="notice error">{error}</p> : null}
            {message ? <p className="notice success">{message}</p> : null}
          </div>
        </form>
      ) : null}
    </main>
  );
}
