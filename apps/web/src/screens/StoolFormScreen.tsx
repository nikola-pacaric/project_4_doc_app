import type {
  BristolStoolType,
  StoolRecord,
  StoolUrgencyLevel,
  UserProfile,
} from '@project4/contracts';
import { stoolDraftDefaults, validateStool, type StoolDraft } from '@project4/forms';
import { getActiveLocale, t, type TranslationKey } from '@project4/i18n';
import {
  createPatientNoStoolMarker,
  createPatientStool,
  getPatientStool,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useEffect, useState, type FormEvent } from 'react';

import { ScreenHeader } from '../components/ScreenHeader';
import { StatusMessage } from '../components/StatusMessage';
import { VoiceTextField } from '../components/VoiceTextField';

interface StoolFormScreenProps {
  client: AppSupabaseClient;
  entryToEdit?: { id: string; occurredAt: string } | null;
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

function localDateTime(value: Date): string {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

function toDraft(record: StoolRecord): StoolDraft {
  return {
    entryId: record.entryId,
    bristolType: record.bristolType,
    urgencyLevel: record.urgencyLevel,
    pain: record.pain,
    mucus: record.mucus,
    blood: record.blood,
    fattyStool: record.fattyStool,
    blackStool: record.blackStool,
    notes: record.notes ?? '',
  };
}

export function StoolFormScreen({
  client,
  entryToEdit,
  onBack,
  onSaved,
  profile,
}: StoolFormScreenProps) {
  const locale = getActiveLocale();
  const [draft, setDraft] = useState<StoolDraft>(initialDraft);
  const [occurredAt, setOccurredAt] = useState<string | undefined>(entryToEdit?.occurredAt);
  const [loading, setLoading] = useState(Boolean(entryToEdit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedStool, setSavedStool] = useState<StoolRecord | null>(null);
  const [savedNoStool, setSavedNoStool] = useState(false);

  useEffect(() => {
    if (!entryToEdit) {
      setDraft(initialDraft);
      setOccurredAt(undefined);
      setSavedStool(null);
      setSavedNoStool(false);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    void getPatientStool(client, entryToEdit.id, entryToEdit.occurredAt)
      .then((record) => {
        if (!active) return;
        if (!record) {
          // Existing entry without stool details (e.g. "No stool today" note).
          setDraft(initialDraft);
          setOccurredAt(entryToEdit.occurredAt);
          return;
        }
        setDraft(toDraft(record));
        setOccurredAt(record.occurredAt);
      })
      .catch(() => {
        if (active) setError(t(locale, 'stool.loadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client, entryToEdit, locale]);

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
      const saved = await createPatientStool(client, profile.id, draft, occurredAt);
      setSavedStool(saved);
    } catch {
      setError(t(locale, 'stool.saveError'));
    } finally {
      setSaving(false);
    }
  }

  async function saveNoStool() {
    setSaving(true);
    setError(null);
    try {
      const daySource = entryToEdit?.occurredAt
        ? new Date(entryToEdit.occurredAt)
        : occurredAt
          ? new Date(occurredAt)
          : new Date();
      const markerOccurredAt = Number.isNaN(daySource.getTime())
        ? localDateTime(new Date())
        : localDateTime(daySource);

      if (entryToEdit?.id && draft.entryId) {
        // Converting an existing stool entry → replace it with the no-stool marker.
        await createPatientNoStoolMarker(client, profile.id, markerOccurredAt, {
          replaceEntryId: entryToEdit.id,
        });
      } else if (entryToEdit?.id) {
        // Updating an existing no-stool note marker.
        await createPatientNoStoolMarker(client, profile.id, markerOccurredAt, {
          entryId: entryToEdit.id,
        });
      } else {
        await createPatientNoStoolMarker(client, profile.id, markerOccurredAt);
      }
      setSavedNoStool(true);
      onSaved();
    } catch {
      setError(t(locale, 'stool.noStoolSaveError'));
    } finally {
      setSaving(false);
    }
  }

  if (savedStool || savedNoStool) {
    return (
      <main className="baseline-layout structured-entry-layout">
        <section className="save-confirmation-card">
          <div className="save-confirmation-icon">✓</div>
          <h1>{t(locale, savedNoStool ? 'stool.noStoolSavedTitle' : 'stool.savedTitle')}</h1>
          <strong>
            {savedNoStool
              ? t(locale, 'stool.noStoolToday')
              : t(locale, 'stool.bristolSelected').replace(
                  '{type}',
                  String(savedStool?.bristolType),
                )}
          </strong>
          <p>{t(locale, savedNoStool ? 'stool.noStoolSavedDetail' : 'stool.savedDetail')}</p>
          <div className="button-row form-actions-row">
            <button
              className="primary-button"
              onClick={() => {
                setSavedStool(null);
                setSavedNoStool(false);
                setDraft(initialDraft);
                setOccurredAt(undefined);
              }}
              type="button"
            >
              {t(locale, savedNoStool ? 'stool.recordBowelMovement' : 'stool.addAnother')}
            </button>
            <button className="secondary-button" onClick={onSaved} type="button">
              {t(locale, 'stool.done')}
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
          subtitle={t(locale, 'stool.subtitle')}
          title={t(locale, 'stool.title')}
        />
      </div>

      {loading ? <p className="empty-state">{t(locale, 'app.loading')}</p> : null}
      {!loading ? (
        <form className="structured-entry-form" onSubmit={(event) => void submit(event)}>
          <fieldset className="structured-fieldset">
            <legend>{t(locale, 'stool.noStoolToday')}</legend>
            <p>{t(locale, 'stool.noStoolDetail')}</p>
            <button
              className="secondary-button"
              disabled={saving}
              onClick={() => void saveNoStool()}
              type="button"
            >
              {t(locale, 'stool.saveNoStool')}
            </button>
          </fieldset>

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

          <fieldset className="structured-fieldset">
            <VoiceTextField
              label={t(locale, 'stool.notes')}
              onChange={(value) => update('notes', value)}
              placeholder={t(locale, 'stool.notesPlaceholder')}
              rows={4}
              type="textarea"
              value={draft.notes ?? ''}
            />
          </fieldset>

          {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
          <div className="button-row form-actions-row">
            <button className="secondary-button" onClick={onBack} type="button">
              {t(locale, 'common.cancel')}
            </button>
            <button className="primary-button" disabled={saving} type="submit">
              {t(locale, 'stool.save')}
            </button>
          </div>
        </form>
      ) : null}
    </main>
  );
}
