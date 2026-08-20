import { menstruationFlows, type MenstruationPainLevel } from '@project4/contracts';
import {
  menstruationDraftDefaults,
  validateMenstruation,
  type MenstruationDraft,
} from '@project4/forms';
import { getActiveLocale, t, type TranslationKey } from '@project4/i18n';
import { useState } from 'react';

import { FormField } from '../components/FormField';
import { TactileChoiceRow } from '../components/TactileChoiceRow';
import { TactileFormShell } from '../components/TactileFormShell';
import { useTactileFormPalette } from '../components/tactileFormPalette';
import { TactileSectionCard } from '../components/TactileSectionCard';
import { TimePickerField } from '../components/TimePickerField';
import {
  tactileFieldLabelStyle,
  tactileMultilineInputStyle,
  tactilePillInputStyle,
} from '../theme/tactileForm';
import { toLocalDateInput, toLocalTimeInput } from '../utils/dateTime';

interface MenstruationFormScreenProps {
  busy?: boolean;
  error?: string | null;
  initialDraft?: MenstruationDraft;
  onBack: () => void;
  onCancelProfile?: () => void;
  onCancelTimeline?: () => void;
  onSave: (draft: MenstruationDraft) => void | Promise<void>;
}

const painLevels: MenstruationPainLevel[] = [1, 2, 3];

function createInitialDraft(): MenstruationDraft {
  const now = new Date();
  return {
    ...menstruationDraftDefaults,
    occurredAt: `${toLocalDateInput(now)} ${toLocalTimeInput(now)}`,
  };
}

export function MenstruationFormScreen({
  busy = false,
  error,
  initialDraft,
  onBack,
  onCancelProfile,
  onCancelTimeline,
  onSave,
}: MenstruationFormScreenProps) {
  const locale = getActiveLocale();
  const palette = useTactileFormPalette();
  const [draft, setDraft] = useState<MenstruationDraft>(() => initialDraft ?? createInitialDraft());
  const [showErrors, setShowErrors] = useState(false);
  const pill = tactilePillInputStyle(palette);
  const multi = tactileMultilineInputStyle(palette);
  const label = tactileFieldLabelStyle(palette);

  function update<K extends keyof MenstruationDraft>(field: K, value: MenstruationDraft[K]) {
    setShowErrors(false);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateDateTime(date: string, time: string) {
    update('occurredAt', `${date} ${time}`);
  }

  function save() {
    if (!validateMenstruation(draft).valid) {
      setShowErrors(true);
      return;
    }
    void onSave(draft);
  }

  const date = draft.occurredAt?.slice(0, 10) ?? '';
  const time = draft.occurredAt?.slice(11, 16) ?? '';

  return (
    <TactileFormShell
      error={showErrors ? t(locale, 'menstruation.requiredError') : error}
      onCancelProfile={onCancelProfile}
      onCancelTimeline={onCancelTimeline}
      onCancelToday={onBack}
      onSave={save}
      saveBusy={busy}
      subtitle={t(locale, 'menstruation.subtitle')}
      title={t(locale, 'menstruation.title')}
    >
      <TactileSectionCard icon="🩸" palette={palette} title={t(locale, 'menstruation.title')}>
        <TactileChoiceRow
          label={t(locale, 'menstruation.flow')}
          mode="segmented"
          onChange={(value) => update('flow', value as MenstruationDraft['flow'])}
          options={menstruationFlows.map((flow) => ({
            value: flow,
            label: t(locale, `menstruation.flow.${flow}` as TranslationKey),
          }))}
          palette={palette}
          value={draft.flow}
        />
        <TactileChoiceRow
          label={t(locale, 'menstruation.pain')}
          onChange={(value) => update('painLevel', Number(value) as MenstruationPainLevel)}
          options={painLevels.map((painLevel) => ({
            value: String(painLevel),
            label: String(painLevel),
            detail: t(locale, `menstruation.pain.${painLevel}` as TranslationKey),
          }))}
          palette={palette}
          value={draft.painLevel === undefined ? undefined : String(draft.painLevel)}
        />
        <FormField
          autoCapitalize="none"
          editable={false}
          label={t(locale, 'menstruation.date')}
          labelStyle={label}
          style={pill}
          value={date}
        />
        <TimePickerField
          label={t(locale, 'menstruation.time')}
          labelStyle={label}
          onChange={(value) => updateDateTime(date, value)}
          placeholder={t(locale, 'menstruation.timePlaceholder')}
          style={pill}
          value={time}
          valueStyle={{ color: palette.onSurface }}
        />
        <FormField
          enableVoice
          label={t(locale, 'menstruation.notes')}
          labelStyle={label}
          multiline
          onChangeText={(value) => update('notes', value)}
          placeholder={t(locale, 'menstruation.notesPlaceholder')}
          style={multi}
          value={draft.notes ?? ''}
        />
      </TactileSectionCard>
    </TactileFormShell>
  );
}
