import type { PatientBaselineProfile, PatientSex, UserProfile } from '@project4/contracts';
import {
  baselineProfileDefaults,
  isCompleteBaselineProfile,
  parseRecentMajorWeightChange,
  type BaselineProfileDraft,
} from '@project4/forms';
import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';
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

const sexOptions: Array<{ value: PatientSex; key: TranslationKey }> = [
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
  return value.trim() === '' ? undefined : Number(value.replace(',', '.'));
}

interface ChronicTherapyInput {
  name: string;
  dose: string;
}

function parseDiseaseNames(value: string | null | undefined): string[] {
  const names = value
    ?.split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);
  return names?.length ? names : [''];
}

function parseChronicTherapies(value: string | null | undefined): ChronicTherapyInput[] {
  const therapies = value
    ?.split(/\r?\n/)
    .map((line) => {
      const [name = '', ...doseParts] = line.split(/\s+[—-]\s+/);
      return { name: name.trim(), dose: doseParts.join(' - ').trim() };
    })
    .filter(({ name, dose }) => name || dose);
  return therapies?.length ? therapies : [{ name: '', dose: '' }];
}

function serializeDiseaseNames(names: string[]): string {
  return names
    .map((name) => name.trim())
    .filter(Boolean)
    .join('\n');
}

function serializeChronicTherapies(therapies: ChronicTherapyInput[]): string {
  return therapies
    .map(({ name, dose }) => {
      const trimmedName = name.trim();
      const trimmedDose = dose.trim();
      if (!trimmedName && !trimmedDose) return '';
      return trimmedDose ? `${trimmedName} — ${trimmedDose}` : trimmedName;
    })
    .filter(Boolean)
    .join('\n');
}

function savedYesNoFromText(
  profile: PatientBaselineProfile | null,
  value: string | null | undefined,
): boolean | undefined {
  if (!profile) return undefined;
  return Boolean(value?.trim());
}

export function BaselineScreen({ client, profile, onBack }: BaselineScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [current, setCurrent] = useState<PatientBaselineProfile | null>(null);
  const [draft, setDraft] = useState<BaselineProfileDraft>({ ...baselineProfileDefaults });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [hasChronicDiseases, setHasChronicDiseases] = useState<boolean>();
  const [hasChronicTherapy, setHasChronicTherapy] = useState<boolean>();
  const [chronicDiseaseNames, setChronicDiseaseNames] = useState<string[]>(['']);
  const [chronicTherapies, setChronicTherapies] = useState<ChronicTherapyInput[]>([
    { name: '', dose: '' },
  ]);

  useEffect(() => {
    let active = true;
    void getPatientBaseline(client, profile.id)
      .then((loaded) => {
        if (!active) return;
        setCurrent(loaded);
        setDraft(toDraft(loaded));
        setHasChronicDiseases(savedYesNoFromText(loaded, loaded?.chronicDiseases));
        setHasChronicTherapy(savedYesNoFromText(loaded, loaded?.chronicTherapy));
        setChronicDiseaseNames(parseDiseaseNames(loaded?.chronicDiseases));
        setChronicTherapies(parseChronicTherapies(loaded?.chronicTherapy));
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
    if (
      !isCompleteBaselineProfile(draft) ||
      hasChronicDiseases === undefined ||
      hasChronicTherapy === undefined ||
      (hasChronicDiseases && chronicDiseaseNames.some((name) => !name.trim())) ||
      (hasChronicTherapy && chronicTherapies.some(({ name, dose }) => !name.trim() || !dose.trim()))
    ) {
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
      onBack();
    } catch {
      setError(t(locale, 'baseline.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="baseline-layout structured-entry-layout">
      <div className="baseline-toolbar">
        <ScreenHeader eyebrow={t(locale, 'role.patient')} title={t(locale, 'baseline.title')} />
        <p className="summary">{t(locale, 'baseline.subtitle')}</p>
      </div>

      {loading ? <p className="empty-state">{t(locale, 'app.loading')}</p> : null}
      {!loading ? (
        <form
          className="structured-entry-form baseline-profile-form"
          onSubmit={(event) => void submit(event)}
        >
          <fieldset className="structured-fieldset">
            <legend>{t(locale, 'baseline.sex')}</legend>
            <div className="choice-row four-options" role="radiogroup">
              {sexOptions.map((option) => (
                <button
                  aria-checked={draft.sex === option.value}
                  className={draft.sex === option.value ? 'selected' : ''}
                  key={option.value}
                  onClick={() => setDraft((value) => ({ ...value, sex: option.value }))}
                  role="radio"
                  type="button"
                >
                  {t(locale, option.key)}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="baseline-field-pair">
            <fieldset className="structured-fieldset">
              <legend>{t(locale, 'baseline.birthYear')}</legend>
              <input
                aria-label={t(locale, 'baseline.birthYear')}
                max={new Date().getFullYear()}
                min="1900"
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    birthYear: optionalNumber(event.target.value),
                  }))
                }
                required
                type="number"
                value={draft.birthYear ?? ''}
              />
            </fieldset>
            <fieldset className="structured-fieldset">
              <legend>{t(locale, 'baseline.occupation')}</legend>
              <input
                aria-label={t(locale, 'baseline.occupation')}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, occupation: event.target.value }))
                }
                required
                value={draft.occupation ?? ''}
              />
            </fieldset>
          </div>
          <div className="baseline-field-pair">
            <fieldset className="structured-fieldset">
              <legend>{t(locale, 'baseline.weightKg')}</legend>
              <input
                aria-label={t(locale, 'baseline.weightKg')}
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
            </fieldset>
            <fieldset className="structured-fieldset">
              <legend>{t(locale, 'baseline.heightCm')}</legend>
              <input
                aria-label={t(locale, 'baseline.heightCm')}
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
            </fieldset>
          </div>
          <fieldset className="structured-fieldset">
            <legend>{t(locale, 'baseline.recentWeightChange')}</legend>
            <div className="choice-row" role="radiogroup">
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
            {draft.recentMajorWeightChange === 'yes' ? (
              <div className="conditional-field-bubble">
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
          </fieldset>
          <fieldset className="structured-fieldset">
            <legend>{t(locale, 'baseline.chronicDiseases')}</legend>
            <div className="choice-row" role="radiogroup">
              {([true, false] as const).map((answer) => (
                <button
                  aria-checked={hasChronicDiseases === answer}
                  className={hasChronicDiseases === answer ? 'selected' : ''}
                  key={String(answer)}
                  onClick={() => {
                    setHasChronicDiseases(answer);
                    if (!answer) {
                      setHasChronicTherapy(false);
                      setDraft((value) => ({
                        ...value,
                        chronicDiseases: '',
                        chronicTherapy: '',
                      }));
                      setChronicDiseaseNames(['']);
                      setChronicTherapies([{ name: '', dose: '' }]);
                    }
                  }}
                  role="radio"
                  type="button"
                >
                  {t(locale, answer ? 'common.yes' : 'common.no')}
                </button>
              ))}
            </div>
            {hasChronicDiseases ? (
              <div className="conditional-field-bubble repeatable-field">
                {chronicDiseaseNames.map((name, index) => (
                  <div className="repeatable-item" key={index}>
                    <label>
                      <span>{t(locale, 'baseline.chronicDiseaseName')}</span>
                      <input
                        onChange={(event) => {
                          const next = chronicDiseaseNames.map((current, currentIndex) =>
                            currentIndex === index ? event.target.value : current,
                          );
                          setChronicDiseaseNames(next);
                          setDraft((value) => ({
                            ...value,
                            chronicDiseases: serializeDiseaseNames(next),
                          }));
                        }}
                        required
                        value={name}
                      />
                    </label>
                    {chronicDiseaseNames.length > 1 ? (
                      <button
                        className="remove-inline-button"
                        onClick={() => {
                          const next = chronicDiseaseNames.filter(
                            (_current, currentIndex) => currentIndex !== index,
                          );
                          setChronicDiseaseNames(next);
                          setDraft((value) => ({
                            ...value,
                            chronicDiseases: serializeDiseaseNames(next),
                          }));
                        }}
                        type="button"
                      >
                        {t(locale, 'common.remove')}
                      </button>
                    ) : null}
                  </div>
                ))}
                <button
                  className="add-inline-button"
                  onClick={() => setChronicDiseaseNames((current) => [...current, ''])}
                  type="button"
                >
                  + {t(locale, 'baseline.addChronicDisease')}
                </button>
              </div>
            ) : null}
          </fieldset>
          <fieldset className="structured-fieldset">
            <legend>{t(locale, 'baseline.chronicTherapy')}</legend>
            <div className="choice-row" role="radiogroup">
              {([true, false] as const).map((answer) => (
                <button
                  aria-checked={hasChronicTherapy === answer}
                  className={hasChronicTherapy === answer ? 'selected' : ''}
                  key={String(answer)}
                  onClick={() => {
                    setHasChronicTherapy(answer);
                    if (!answer) {
                      setDraft((value) => ({ ...value, chronicTherapy: '' }));
                      setChronicTherapies([{ name: '', dose: '' }]);
                    }
                  }}
                  role="radio"
                  type="button"
                >
                  {t(locale, answer ? 'common.yes' : 'common.no')}
                </button>
              ))}
            </div>
            {hasChronicTherapy ? (
              <div className="conditional-field-bubble repeatable-field">
                {chronicTherapies.map((therapy, index) => (
                  <div className="repeatable-item" key={index}>
                    <label>
                      <span>{t(locale, 'baseline.chronicTherapyName')}</span>
                      <input
                        autoCapitalize="words"
                        onChange={(event) => {
                          const next = chronicTherapies.map((current, currentIndex) =>
                            currentIndex === index
                              ? { ...current, name: event.target.value }
                              : current,
                          );
                          setChronicTherapies(next);
                          setDraft((value) => ({
                            ...value,
                            chronicTherapy: serializeChronicTherapies(next),
                          }));
                        }}
                        required
                        value={therapy.name}
                      />
                    </label>
                    <label>
                      <span>{t(locale, 'baseline.chronicTherapyDose')}</span>
                      <input
                        onChange={(event) => {
                          const next = chronicTherapies.map((current, currentIndex) =>
                            currentIndex === index
                              ? { ...current, dose: event.target.value }
                              : current,
                          );
                          setChronicTherapies(next);
                          setDraft((value) => ({
                            ...value,
                            chronicTherapy: serializeChronicTherapies(next),
                          }));
                        }}
                        required
                        value={therapy.dose}
                      />
                    </label>
                    {chronicTherapies.length > 1 ? (
                      <button
                        className="remove-inline-button"
                        onClick={() => {
                          const next = chronicTherapies.filter(
                            (_current, currentIndex) => currentIndex !== index,
                          );
                          setChronicTherapies(next);
                          setDraft((value) => ({
                            ...value,
                            chronicTherapy: serializeChronicTherapies(next),
                          }));
                        }}
                        type="button"
                      >
                        {t(locale, 'common.remove')}
                      </button>
                    ) : null}
                  </div>
                ))}
                <button
                  className="add-inline-button"
                  onClick={() =>
                    setChronicTherapies((current) => [...current, { name: '', dose: '' }])
                  }
                  type="button"
                >
                  + {t(locale, 'baseline.addChronicTherapy')}
                </button>
              </div>
            ) : null}
          </fieldset>
          {draft.sex === 'female' ? (
            <fieldset className="structured-fieldset">
              <legend>{t(locale, 'baseline.menstrualHistory')}</legend>
              <textarea
                aria-label={t(locale, 'baseline.menstrualHistory')}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, menstrualHistory: event.target.value }))
                }
                rows={3}
                value={draft.menstrualHistory ?? ''}
              />
            </fieldset>
          ) : null}
          <div className="button-row form-actions-row">
            <button className="secondary-button" onClick={onBack} type="button">
              {t(locale, 'common.cancel')}
            </button>
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
