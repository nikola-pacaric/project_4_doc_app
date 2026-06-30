import type { UserProfile } from '@project4/contracts';
import { medicationDraftDefaults, validateMedication, type MedicationDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { createPatientMedication, type AppSupabaseClient } from '@project4/supabase-client';
import { useState, type FormEvent } from 'react';

import { ScreenHeader } from '../components/ScreenHeader';

interface MedicationFormScreenProps {
  client: AppSupabaseClient;
  onBack: () => void;
  onSaved: () => void;
  profile: UserProfile;
}

function toDatetimeLocal(value: Date): string {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

export function MedicationFormScreen({
  client,
  onBack,
  onSaved,
  profile,
}: MedicationFormScreenProps) {
  const locale = DEFAULT_LOCALE;
  const [draft, setDraft] = useState<MedicationDraft>({
    ...medicationDraftDefaults,
    takenAt: toDatetimeLocal(new Date()),
    isChronicTherapy: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof MedicationDraft>(field: K, value: MedicationDraft[K]) {
    setError(null);
    setDraft((current) => ({ ...current, [field]: value }));
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

  return (
    <main className="baseline-layout structured-entry-layout">
      <div className="baseline-toolbar">
        <ScreenHeader
          eyebrow={t(locale, 'role.patient')}
          subtitle={t(locale, 'medication.subtitle')}
          title={t(locale, 'medication.title')}
        />
      </div>

      <form className="structured-entry-form" onSubmit={(event) => void submit(event)}>
        <label>
          <span>{t(locale, 'medication.name')}</span>
          <input
            autoComplete="off"
            onChange={(event) => update('name', event.target.value)}
            placeholder={t(locale, 'medication.namePlaceholder')}
            value={draft.name ?? ''}
          />
        </label>
        <label>
          <span>{t(locale, 'medication.dose')}</span>
          <input
            autoComplete="off"
            onChange={(event) => update('dose', event.target.value)}
            placeholder={t(locale, 'medication.dosePlaceholder')}
            value={draft.dose ?? ''}
          />
        </label>
        <label>
          <span>{t(locale, 'medication.timeTaken')}</span>
          <input
            onChange={(event) => update('takenAt', event.target.value)}
            type="datetime-local"
            value={draft.takenAt ?? ''}
          />
        </label>
        <label>
          <span>{t(locale, 'medication.reason')}</span>
          <textarea
            onChange={(event) => update('reason', event.target.value)}
            placeholder={t(locale, 'medication.reasonPlaceholder')}
            rows={4}
            value={draft.reason ?? ''}
          />
        </label>

        <label className="switch-field">
          <span className="switch-copy">
            <strong>{t(locale, 'medication.chronicTherapy')}</strong>
            <small>{t(locale, 'medication.chronicTherapyHelp')}</small>
          </span>
          <input
            checked={draft.isChronicTherapy ?? false}
            onChange={(event) => update('isChronicTherapy', event.target.checked)}
            type="checkbox"
          />
        </label>

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
    </main>
  );
}
