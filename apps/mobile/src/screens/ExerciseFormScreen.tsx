import { exerciseIntensities } from '@project4/contracts';
import { exerciseDraftDefaults, validateExercise, type ExerciseDraft } from '@project4/forms';
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

interface ExerciseFormScreenProps {
  busy?: boolean;
  error?: string | null;
  initialDraft?: ExerciseDraft;
  onBack: () => void;
  onCancelProfile?: () => void;
  onCancelTimeline?: () => void;
  onSave: (draft: ExerciseDraft) => void | Promise<void>;
}

function createInitialDraft(): ExerciseDraft {
  const now = new Date();
  return {
    ...exerciseDraftDefaults,
    occurredAt: `${toLocalDateInput(now)} ${toLocalTimeInput(now)}`,
  };
}

export function ExerciseFormScreen({
  busy = false,
  error,
  initialDraft,
  onBack,
  onCancelProfile,
  onCancelTimeline,
  onSave,
}: ExerciseFormScreenProps) {
  const locale = getActiveLocale();
  const palette = useTactileFormPalette();
  const [draft, setDraft] = useState<ExerciseDraft>(() => initialDraft ?? createInitialDraft());
  const [showErrors, setShowErrors] = useState(false);
  const pill = tactilePillInputStyle(palette);
  const multi = tactileMultilineInputStyle(palette);
  const label = tactileFieldLabelStyle(palette);

  function update<K extends keyof ExerciseDraft>(field: K, value: ExerciseDraft[K]) {
    setShowErrors(false);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateDateTime(date: string, time: string) {
    update('occurredAt', `${date} ${time}`);
  }

  function save() {
    if (!validateExercise(draft).valid) {
      setShowErrors(true);
      return;
    }
    void onSave(draft);
  }

  const date = draft.occurredAt?.slice(0, 10) ?? '';
  const time = draft.occurredAt?.slice(11, 16) ?? '';

  return (
    <TactileFormShell
      error={showErrors ? t(locale, 'exercise.requiredError') : error}
      onCancelProfile={onCancelProfile}
      onCancelTimeline={onCancelTimeline}
      onCancelToday={onBack}
      onSave={save}
      saveBusy={busy}
      subtitle={t(locale, 'exercise.subtitle')}
      title={t(locale, 'exercise.title')}
    >
      <TactileSectionCard icon="🏃" palette={palette} title={t(locale, 'exercise.title')}>
        <FormField
          autoCapitalize="sentences"
          enableVoice
          label={t(locale, 'exercise.activity')}
          labelStyle={label}
          onChangeText={(value) => update('activity', value)}
          placeholder={t(locale, 'exercise.activityPlaceholder')}
          style={pill}
          value={draft.activity ?? ''}
        />
        <FormField
          keyboardType="number-pad"
          label={t(locale, 'exercise.duration')}
          labelStyle={label}
          onChangeText={(value) => {
            const parsed = Number(value);
            update('durationMinutes', value.trim() && Number.isFinite(parsed) ? parsed : undefined);
          }}
          placeholder={t(locale, 'exercise.durationPlaceholder')}
          style={pill}
          value={draft.durationMinutes === undefined ? '' : String(draft.durationMinutes)}
        />
        <TactileChoiceRow
          label={t(locale, 'exercise.intensity')}
          mode="segmented"
          onChange={(value) => update('intensity', value as ExerciseDraft['intensity'])}
          options={exerciseIntensities.map((intensity) => ({
            value: intensity,
            label: t(locale, `exercise.intensity.${intensity}` as TranslationKey),
          }))}
          palette={palette}
          value={draft.intensity}
        />
        <FormField
          autoCapitalize="none"
          editable={false}
          label={t(locale, 'exercise.date')}
          labelStyle={label}
          style={pill}
          value={date}
        />
        <TimePickerField
          label={t(locale, 'exercise.time')}
          labelStyle={label}
          onChange={(value) => updateDateTime(date, value)}
          placeholder={t(locale, 'exercise.timePlaceholder')}
          style={pill}
          value={time}
          valueStyle={{ color: palette.onSurface }}
        />
        <FormField
          enableVoice
          label={t(locale, 'exercise.notes')}
          labelStyle={label}
          multiline
          onChangeText={(value) => update('notes', value)}
          placeholder={t(locale, 'exercise.notesPlaceholder')}
          style={multi}
          value={draft.notes ?? ''}
        />
      </TactileSectionCard>
    </TactileFormShell>
  );
}
