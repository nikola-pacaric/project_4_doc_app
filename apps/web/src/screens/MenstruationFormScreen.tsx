import {
  menstruationFlows,
  type MenstruationRecord,
  type MenstruationPainLevel,
  type UserProfile,
} from '@project4/contracts';
import {
  menstruationDraftDefaults,
  validateMenstruation,
  type MenstruationDraft,
} from '@project4/forms';
import { DEFAULT_LOCALE, t, type TranslationKey } from '@project4/i18n';
import {
  createPatientMenstruation,
  getPatientMenstruation,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useEffect, useState, type FormEvent } from 'react';

import { ScreenHeader } from '../components/ScreenHeader';

interface MenstruationFormScreenProps {
  client: AppSupabaseClient;
  entryToEdit?: { id: string; occurredAt: string } | null;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

const painLevels: MenstruationPainLevel[] = [1, 2, 3];

function toDatetimeLocal(value: Date): string {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

function createInitialDraft(): MenstruationDraft {
  return {
    ...menstruationDraftDefaults,
    occurredAt: toDatetimeLocal(new Date()),
  };
}

function toDraft(record: MenstruationRecord): MenstruationDraft {
  return {
    entryId: record.entryId,
    flow: record.flow,
    painLevel: record.painLevel,
    occurredAt: toDatetimeLocal(new Date(record.occurredAt)),
    notes: record.notes ?? '',
  };
}

export function MenstruationFormScreen({
  client,
  entryToEdit,
  onBack,
  onSaved,
  profile,
}: MenstruationFormScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [draft, setDraft] = useState<MenstruationDraft>(createInitialDraft);
  const [loading, setLoading] = useState(Boolean(entryToEdit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entryToEdit) {
      setDraft(createInitialDraft());
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    void getPatientMenstruation(client, entryToEdit.id, entryToEdit.occurredAt)
      .then((record) => {
        if (!active) return;
        if (!record) {
          setError(t(locale, 'menstruation.loadError'));
          return;
        }
        setDraft(toDraft(record));
      })
      .catch(() => {
        if (active) setError(t(locale, 'menstruation.loadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client, entryToEdit, locale]);

  function update<K extends keyof MenstruationDraft>(field: K, value: MenstruationDraft[K]) {
    setError(null);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validateMenstruation(draft).valid) {
      setError(t(locale, 'menstruation.requiredError'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createPatientMenstruation(client, profile.id, draft);
      onSaved();
    } catch {
      setError(t(locale, 'menstruation.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="baseline-layout structured-entry-layout">
      <div className="baseline-toolbar">
        <ScreenHeader
          eyebrow={t(locale, 'role.patient')}
          subtitle={t(locale, 'menstruation.subtitle')}
          title={t(locale, 'menstruation.title')}
        />
      </div>

      {loading ? <p className="empty-state">{t(locale, 'app.loading')}</p> : null}
      {!loading ? (
      <form className="structured-entry-form" onSubmit={(event) => void submit(event)}>
        <fieldset className="structured-fieldset">
          <legend>{t(locale, 'menstruation.flow')}</legend>
          <div className="choice-row three-options" role="radiogroup">
            {menstruationFlows.map((flow) => (
              <button
                aria-checked={draft.flow === flow}
                className={draft.flow === flow ? 'selected' : ''}
                key={flow}
                onClick={() => update('flow', flow)}
                role="radio"
                type="button"
              >
                {t(locale, `menstruation.flow.${flow}` as TranslationKey)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="structured-fieldset">
          <legend>{t(locale, 'menstruation.pain')}</legend>
          <div className="choice-row three-options" role="radiogroup">
            {painLevels.map((painLevel) => (
              <button
                aria-checked={draft.painLevel === painLevel}
                className={draft.painLevel === painLevel ? 'selected' : ''}
                key={painLevel}
                onClick={() => update('painLevel', painLevel)}
                role="radio"
                type="button"
              >
                {painLevel} · {t(locale, `menstruation.pain.${painLevel}` as TranslationKey)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="structured-fieldset">
          <legend>{t(locale, 'menstruation.date')}</legend>
          <input
            aria-label={t(locale, 'menstruation.date')}
            onChange={(event) => update('occurredAt', event.target.value)}
            type="datetime-local"
            value={draft.occurredAt ?? ''}
          />
        </fieldset>
        <fieldset className="structured-fieldset">
          <legend>{t(locale, 'menstruation.notes')}</legend>
          <textarea
            aria-label={t(locale, 'menstruation.notes')}
            onChange={(event) => update('notes', event.target.value)}
            placeholder={t(locale, 'menstruation.notesPlaceholder')}
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
            {t(locale, 'menstruation.save')}
          </button>
        </div>
      </form>
      ) : null}
    </main>
  );
}
