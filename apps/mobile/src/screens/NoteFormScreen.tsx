import { noteDraftDefaults, validateNote, type NoteDraft } from '@project4/forms';
import { getActiveLocale, t } from '@project4/i18n';
import { useState } from 'react';

import { FormField } from '../components/FormField';
import { TactileFormShell } from '../components/TactileFormShell';
import { useTactileFormPalette } from '../components/tactileFormPalette';
import { TactileSectionCard } from '../components/TactileSectionCard';
import { TimePickerField } from '../components/TimePickerField';
import { VoiceTextField } from '../components/VoiceTextField';
import {
  tactileFieldLabelStyle,
  tactileMultilineInputStyle,
  tactilePillInputStyle,
} from '../theme/tactileForm';
import { toLocalDateInput, toLocalTimeInput } from '../utils/dateTime';

interface NoteFormScreenProps {
  busy?: boolean;
  error?: string | null;
  initialDraft?: NoteDraft;
  onBack: () => void;
  onCancelProfile?: () => void;
  onCancelTimeline?: () => void;
  onSave: (draft: NoteDraft) => void | Promise<void>;
}

function createInitialDraft(): NoteDraft {
  const now = new Date();
  return {
    ...noteDraftDefaults,
    occurredAt: `${toLocalDateInput(now)} ${toLocalTimeInput(now)}`,
  };
}

export function NoteFormScreen({
  busy = false,
  error,
  initialDraft,
  onBack,
  onCancelProfile,
  onCancelTimeline,
  onSave,
}: NoteFormScreenProps) {
  const locale = getActiveLocale();
  const palette = useTactileFormPalette();
  const [draft, setDraft] = useState<NoteDraft>(() => initialDraft ?? createInitialDraft());
  const [showErrors, setShowErrors] = useState(false);
  const pill = tactilePillInputStyle(palette);
  const multi = tactileMultilineInputStyle(palette);
  const label = tactileFieldLabelStyle(palette);

  function update<K extends keyof NoteDraft>(field: K, value: NoteDraft[K]) {
    setShowErrors(false);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateDateTime(date: string, time: string) {
    update('occurredAt', `${date} ${time}`);
  }

  function save() {
    if (!validateNote(draft).valid) {
      setShowErrors(true);
      return;
    }
    void onSave(draft);
  }

  const date = draft.occurredAt?.slice(0, 10) ?? '';
  const time = draft.occurredAt?.slice(11, 16) ?? '';

  return (
    <TactileFormShell
      error={showErrors ? t(locale, 'note.requiredError') : error}
      onCancelProfile={onCancelProfile}
      onCancelTimeline={onCancelTimeline}
      onCancelToday={onBack}
      onSave={save}
      saveBusy={busy}
      subtitle={t(locale, 'note.subtitle')}
      title={t(locale, 'note.title')}
    >
      <TactileSectionCard icon="✎" palette={palette} title={t(locale, 'note.title')}>
        <VoiceTextField
          autoCapitalize="sentences"
          label={t(locale, 'note.text')}
          labelStyle={label}
          multiline
          onChangeText={(value) => update('text', value)}
          placeholder={t(locale, 'note.textPlaceholder')}
          style={multi}
          value={draft.text ?? ''}
        />
        <FormField
          autoCapitalize="none"
          editable={false}
          label={t(locale, 'note.date')}
          labelStyle={label}
          style={pill}
          value={date}
        />
        <TimePickerField
          label={t(locale, 'note.time')}
          labelStyle={label}
          onChange={(value) => updateDateTime(date, value)}
          placeholder={t(locale, 'note.timePlaceholder')}
          style={pill}
          value={time}
          valueStyle={{ color: palette.onSurface }}
        />
      </TactileSectionCard>
    </TactileFormShell>
  );
}
