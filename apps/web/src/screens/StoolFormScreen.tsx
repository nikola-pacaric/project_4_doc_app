import type { BristolStoolType, StoolUrgencyLevel, UserProfile } from '@project4/contracts';
import { stoolDraftDefaults, validateStool, type StoolDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';
import { createPatientStool, type AppSupabaseClient } from '@project4/supabase-client';
import { useState, type FormEvent } from 'react';

import { ScreenHeader } from '../components/ScreenHeader';

interface StoolFormScreenProps {
  client: AppSupabaseClient;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

const bristolTypes: BristolStoolType[] = [1, 2, 3, 4, 5, 6, 7];
const urgencyLevels: StoolUrgencyLevel[] = ['none', 'mild', 'moderate', 'severe'];
const symptomFields = ['pain', 'mucus', 'blood', 'fattyStool', 'blackStool'] as const;

const initialDraft: StoolDraft = {
  ...stoolDraftDefaults,
  pain: false,
  mucus: false,
  blood: false,
  fattyStool: false,
  blackStool: false,
};

export function StoolFormScreen({ client, onBack, onSaved, profile }: StoolFormScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [draft, setDraft] = useState<StoolDraft>(initialDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof StoolDraft>(field: K, value: StoolDraft[K]) {
    setError(null);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validateStool(draft).valid) {
      setError(t(locale, 'stool.requiredError'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createPatientStool(client, profile.id, draft);
      onSaved();
    } catch {
      setError(t(locale, 'stool.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="baseline-layout structured-entry-layout">
      <div className="baseline-toolbar">
        <ScreenHeader
          eyebrow={t(locale, 'role.patient')}
          subtitle={t(locale, 'stool.subtitle')}
          title={t(locale, 'stool.title')}
        />
      </div>

      <form className="structured-entry-form" onSubmit={(event) => void submit(event)}>
        <fieldset className="structured-fieldset">
          <legend>{t(locale, 'stool.bristolType')}</legend>
          <div className="bristol-grid" role="radiogroup">
            {bristolTypes.map((type) => (
              <button
                aria-checked={draft.bristolType === type}
                className={draft.bristolType === type ? 'selected' : ''}
                key={type}
                onClick={() => update('bristolType', type)}
                role="radio"
                type="button"
              >
                {type}
              </button>
            ))}
          </div>
          {draft.bristolType ? (
            <div className="bristol-summary">
              <strong>
                {t(locale, 'stool.bristolSelected').replace('{type}', String(draft.bristolType))}
              </strong>
              <span>
                {t(locale, `stool.bristolDescription.${draft.bristolType}` as TranslationKey)}
              </span>
            </div>
          ) : null}
        </fieldset>

        <fieldset className="structured-fieldset">
          <legend>{t(locale, 'stool.urgency')}</legend>
          <div className="choice-row four-options" role="radiogroup">
            {urgencyLevels.map((level) => (
              <button
                aria-checked={draft.urgencyLevel === level}
                className={draft.urgencyLevel === level ? 'selected' : ''}
                key={level}
                onClick={() => update('urgencyLevel', level)}
                role="radio"
                type="button"
              >
                {t(locale, `stool.urgency.${level}` as TranslationKey)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="structured-fieldset">
          <legend>{t(locale, 'stool.checkmarks')}</legend>
          <div className="check-grid">
            {symptomFields.map((field) => (
              <label className="check-card" key={field}>
                <input
                  checked={draft[field] ?? false}
                  onChange={(event) => update(field, event.target.checked)}
                  type="checkbox"
                />
                <span>{t(locale, `stool.${field}` as TranslationKey)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          <span>{t(locale, 'stool.notes')}</span>
          <textarea
            onChange={(event) => update('notes', event.target.value)}
            placeholder={t(locale, 'stool.notesPlaceholder')}
            rows={4}
            value={draft.notes ?? ''}
          />
        </label>

        <p className="tracking-disclaimer">△ {t(locale, 'stool.disclaimer')}</p>
        {error ? <p className="notice error">{error}</p> : null}
        <div className="button-row form-actions-row">
          <button className="secondary-button" onClick={onBack} type="button">
            {t(locale, 'common.cancel')}
          </button>
          <button className="primary-button" disabled={saving} type="submit">
            {t(locale, 'stool.save')}
          </button>
        </div>
      </form>
    </main>
  );
}
