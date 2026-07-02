import type { SymptomRecord, SymptomType, UserProfile } from '@project4/contracts';
import {
  createSymptomDraft,
  validateSymptom,
  validateSymptoms,
  type SymptomDraft,
} from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import {
  listPatientSymptoms,
  savePatientSymptoms,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useEffect, useState, type FormEvent } from 'react';

import { ScreenHeader } from '../components/ScreenHeader';
import { SymptomFields } from '../components/SymptomFields';

interface SymptomFormScreenProps {
  client: AppSupabaseClient;
  onBack: () => void;
  profile: UserProfile;
}

function localDateTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function currentLocalDateTime(): string {
  return localDateTime(new Date().toISOString());
}

function todayRange(): { start: string; end: string } {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
    end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString(),
  };
}

function toDraft(record: SymptomRecord): SymptomDraft {
  return {
    entryId: record.entryId,
    type: record.type,
    customType: record.customType ?? '',
    startedAt: localDateTime(record.startedAt),
    endedAt: localDateTime(record.endedAt),
    intensity: record.intensity,
    modifyingFactors: record.modifyingFactors ?? '',
    wokeFromSleep: record.wokeFromSleep,
    painLocation: record.painLocation ?? undefined,
    painLocationCustom: record.painLocationCustom ?? '',
    painRadiates: record.painRadiates ?? undefined,
    painRadiation: record.painRadiation ?? '',
    painDescription: record.painDescription ?? undefined,
    painDescriptionCustom: record.painDescriptionCustom ?? '',
  };
}

export function SymptomFormScreen({ client, onBack, profile }: SymptomFormScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [drafts, setDrafts] = useState<SymptomDraft[]>([]);
  const [expanded, setExpanded] = useState<SymptomType[]>([]);
  const [invalid, setInvalid] = useState<SymptomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const range = todayRange();
    void listPatientSymptoms(client, profile.id, range.start, range.end)
      .then((records) => {
        if (!active) return;
        const loaded = records.map(toDraft);
        setDrafts(loaded);
        setExpanded(loaded.flatMap((draft) => (draft.type ? [draft.type] : [])));
      })
      .catch(() => active && setError(t(locale, 'symptom.loadError')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [client, locale, profile.id]);

  function toggle(type: SymptomType) {
    const selected = drafts.some((draft) => draft.type === type);
    setDrafts((current) =>
      selected
        ? current.filter((draft) => draft.type !== type)
        : [...current, createSymptomDraft(type, currentLocalDateTime())],
    );
    setExpanded((current) =>
      selected
        ? current.filter((candidate) => candidate !== type)
        : [...current.filter((candidate) => candidate !== type), type],
    );
    setInvalid((current) => current.filter((candidate) => candidate !== type));
  }

  function toggleExpanded(type: SymptomType) {
    setExpanded((current) =>
      current.includes(type)
        ? current.filter((candidate) => candidate !== type)
        : [...current, type],
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validateSymptoms(drafts)) {
      const invalidTypes = drafts.flatMap((draft) =>
        draft.type && !validateSymptom(draft).valid ? [draft.type] : [],
      );
      setInvalid(invalidTypes);
      setExpanded((current) => [...new Set([...current, ...invalidTypes])]);
      setError(t(locale, 'symptom.requiredError'));
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const range = todayRange();
      await savePatientSymptoms(client, range, drafts);
      const saved = (await listPatientSymptoms(client, profile.id, range.start, range.end)).map(
        toDraft,
      );
      setDrafts(saved);
      setInvalid([]);
      setMessage(t(locale, 'symptom.saved'));
    } catch {
      setError(t(locale, 'symptom.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="baseline-layout structured-entry-layout symptom-layout">
      <div className="baseline-toolbar">
        <ScreenHeader eyebrow={t(locale, 'role.patient')} title={t(locale, 'symptom.title')} />
        <p className="summary">{t(locale, 'symptom.subtitle')}</p>
      </div>
      {loading ? <p className="empty-state">{t(locale, 'app.loading')}</p> : null}
      {!loading ? (
        <form className="structured-entry-form symptom-form" onSubmit={(event) => void submit(event)}>
          <fieldset className="structured-fieldset symptom-section-heading">
            <legend>{t(locale, 'symptom.selectTitle')}</legend>
            <p>{t(locale, 'symptom.selectHelp')}</p>
            <SymptomFields
              drafts={drafts}
              expanded={expanded}
              invalid={invalid}
              onChange={(type, draft) =>
                setDrafts((current) =>
                  current.map((candidate) => (candidate.type === type ? draft : candidate)),
                )
              }
              onToggle={toggle}
              onToggleExpanded={toggleExpanded}
            />
          </fieldset>
          <div className="form-actions">
            <button className="secondary-button" onClick={onBack} type="button">
              {t(locale, 'common.cancel')}
            </button>
            <button className="primary-button" disabled={saving} type="submit">
              {t(locale, 'symptom.save')}
            </button>
            {error ? <p className="notice error">{error}</p> : null}
            {message ? <p className="notice success">{message}</p> : null}
          </div>
        </form>
      ) : null}
    </main>
  );
}
