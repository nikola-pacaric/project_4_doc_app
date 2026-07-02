import type { MedicationRecord, UserProfile } from '@project4/contracts';
import { medicationDraftDefaults, validateMedication, type MedicationDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import {
  createPatientMedication,
  getPatientMedication,
  type AppSupabaseClient,
} from '@project4/supabase-client';
import { useEffect, useState, type FormEvent } from 'react';

import { ScreenHeader } from '../components/ScreenHeader';

interface MedicationFormScreenProps {
  client: AppSupabaseClient;
  entryToEdit?: { id: string; occurredAt: string } | null;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

function toLocalDateTime(value: Date): string {
  const offset = value.getTimezoneOffset() * 60_000;
  const localValue = new Date(value.getTime() - offset).toISOString();
  return `${localValue.slice(0, 10)} ${localValue.slice(11, 16)}`;
}

function createInitialDraft(): MedicationDraft {
  return {
    ...medicationDraftDefaults,
    takenAt: toLocalDateTime(new Date()),
    isChronicTherapy: false,
  };
}

function toDraft(record: MedicationRecord): MedicationDraft {
  return {
    entryId: record.entryId,
    name: record.name,
    dose: record.dose,
    takenAt: toLocalDateTime(new Date(record.occurredAt)),
    reason: record.reason ?? '',
    isChronicTherapy: record.isChronicTherapy,
  };
}

export function MedicationFormScreen({
  client,
  entryToEdit,
  onBack,
  onSaved,
  profile,
}: MedicationFormScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [draft, setDraft] = useState<MedicationDraft>(createInitialDraft);
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
    void getPatientMedication(client, entryToEdit.id, entryToEdit.occurredAt)
      .then((record) => {
        if (!active) return;
        if (!record) {
          setError(t(locale, 'medication.loadError'));
          return;
        }
        setDraft(toDraft(record));
      })
      .catch(() => {
        if (active) setError(t(locale, 'medication.loadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client, entryToEdit, locale]);

  function update<K extends keyof MedicationDraft>(field: K, value: MedicationDraft[K]) {
    setError(null);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateTime(value: string) {
    const date = draft.takenAt?.slice(0, 10) ?? toLocalDateTime(new Date()).slice(0, 10);
    update('takenAt', `${date} ${value}`);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validateMedication(draft).valid) {
      setError(t(locale, 'medication.requiredError'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createPatientMedication(client, profile.id, draft);
      onSaved();
    } catch {
      setError(t(locale, 'medication.saveError'));
    } finally {
      setSaving(false);
    }
  }

  const time = draft.takenAt?.slice(11, 16) ?? '';

  return (
    <main className="baseline-layout structured-entry-layout">
      <div className="baseline-toolbar">
        <ScreenHeader
          eyebrow={t(locale, 'role.patient')}
          subtitle={t(locale, 'medication.subtitle')}
          title={t(locale, 'medication.title')}
        />
      </div>

      {loading ? <p className="empty-state">{t(locale, 'app.loading')}</p> : null}
      {!loading ? (
      <form className="structured-entry-form" onSubmit={(event) => void submit(event)}>
        <fieldset className="structured-fieldset">
          <legend>{t(locale, 'medication.name')}</legend>
          <input
            aria-label={t(locale, 'medication.name')}
            autoComplete="off"
            onChange={(event) => update('name', event.target.value)}
            placeholder={t(locale, 'medication.namePlaceholder')}
            value={draft.name ?? ''}
          />
        </fieldset>
        <fieldset className="structured-fieldset">
          <legend>{t(locale, 'medication.dose')}</legend>
          <input
            aria-label={t(locale, 'medication.dose')}
            autoComplete="off"
            onChange={(event) => update('dose', event.target.value)}
            placeholder={t(locale, 'medication.dosePlaceholder')}
            value={draft.dose ?? ''}
          />
        </fieldset>
        <fieldset className="structured-fieldset">
          <legend>{t(locale, 'medication.timeTaken')}</legend>
          <input
            aria-label={t(locale, 'medication.timeTaken')}
            onChange={(event) => updateTime(event.target.value)}
            placeholder={t(locale, 'medication.timePlaceholder')}
            type="time"
            value={time}
          />
        </fieldset>
        <fieldset className="structured-fieldset">
          <legend>{t(locale, 'medication.reason')}</legend>
          <textarea
            aria-label={t(locale, 'medication.reason')}
            onChange={(event) => update('reason', event.target.value)}
            placeholder={t(locale, 'medication.reasonPlaceholder')}
            rows={4}
            value={draft.reason ?? ''}
          />
        </fieldset>

        {error ? <p className="notice error">{error}</p> : null}
        <div className="button-row form-actions-row">
          <button className="secondary-button" onClick={onBack} type="button">
            {t(locale, 'common.cancel')}
          </button>
          <button className="primary-button" disabled={saving} type="submit">
            {t(locale, 'medication.save')}
          </button>
        </div>
      </form>
      ) : null}
    </main>
  );
}
