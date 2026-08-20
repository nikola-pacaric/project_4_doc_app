import {
  menstruationFlows,
  researchCalendarDateTime,
  type MenstruationRecord,
  type MenstruationPainLevel,
  type UserProfile,
} from '@project4/contracts';
import {
  menstruationDraftDefaults,
  validateMenstruation,
  type MenstruationDraft,
} from '@project4/forms';
import { getActiveLocale, t, type TranslationKey } from '@project4/i18n';
import {
  createPatientMenstruation,
  getPatientMenstruation,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useEffect, useState, type FormEvent } from 'react';

import { ScreenHeader } from '../components/ScreenHeader';
import { StatusMessage } from '../components/StatusMessage';
import { VoiceTextField } from '../components/VoiceTextField';

interface MenstruationFormScreenProps {
  client: AppSupabaseClient;
  entryToEdit?: { id: string; occurredAt: string } | null;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

const painLevels: MenstruationPainLevel[] = [1, 2, 3];

function toDatetimeLocal(value: Date): string {
  return researchCalendarDateTime(value);
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

export function MenstruationFormScreen({ entryToEdit, ...props }: MenstruationFormScreenProps) {
  return (
    <MenstruationFormContent
      key={entryToEdit ? `${entryToEdit.id}:${entryToEdit.occurredAt}` : 'new'}
      entryToEdit={entryToEdit}
      {...props}
    />
  );
}

function MenstruationFormContent({
  client,
  entryToEdit,
  onBack,
  onSaved,
  profile,
}: MenstruationFormScreenProps) {
  const locale = getActiveLocale();
  const [draft, setDraft] = useState<MenstruationDraft>(createInitialDraft);
  const [loading, setLoading] = useState(Boolean(entryToEdit));
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entryToEdit) return;

    let active = true;
    void getPatientMenstruation(client, entryToEdit.id, entryToEdit.occurredAt)
      .then((record) => {
        if (!active) return;
        if (!record) {
          setError(t(locale, 'menstruation.loadError'));
          setLoadFailed(true);
          return;
        }
        setDraft(toDraft(record));
      })
      .catch(() => {
        if (!active) return;
        setLoadFailed(true);
        setError(t(locale, 'menstruation.loadError'));
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

  function update<K extends keyof MenstruationDraft>(field: K, value: MenstruationDraft[K]) {
    setError(null);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateDateTime(date: string, time: string) {
    update('occurredAt', `${date} ${time}`);
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

  const date = draft.occurredAt?.slice(0, 10) ?? '';
  const time = draft.occurredAt?.slice(11, 16) ?? '';

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
      {!loading && loadFailed ? (
        <section className="structured-entry-form">
          <StatusMessage tone="error">{error ?? t(locale, 'menstruation.loadError')}</StatusMessage>
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

          <div className="exercise-field-grid">
            <fieldset className="structured-fieldset">
              <legend>{t(locale, 'menstruation.date')}</legend>
              <input aria-label={t(locale, 'menstruation.date')} readOnly value={date} />
            </fieldset>
            <fieldset className="structured-fieldset">
              <legend>{t(locale, 'menstruation.time')}</legend>
              <input
                aria-label={t(locale, 'menstruation.time')}
                onChange={(event) => updateDateTime(date, event.target.value)}
                placeholder={t(locale, 'menstruation.timePlaceholder')}
                type="time"
                value={time}
              />
            </fieldset>
          </div>
          <fieldset className="structured-fieldset">
            <VoiceTextField
              label={t(locale, 'menstruation.notes')}
              onChange={(value) => update('notes', value)}
              placeholder={t(locale, 'menstruation.notesPlaceholder')}
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
              {t(locale, 'menstruation.save')}
            </button>
          </div>
        </form>
      ) : null}
    </main>
  );
}
