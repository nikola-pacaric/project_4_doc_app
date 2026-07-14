import type { BristolStoolType, StoolUrgencyLevel } from '@project4/contracts';
import { stoolDraftDefaults, validateStool, type StoolDraft } from '@project4/forms';
import { getActiveLocale, t, type TranslationKey } from '@project4/i18n';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FormField } from '../components/FormField';
import { TactileChoiceRow } from '../components/TactileChoiceRow';
import { TactileFormShell, useTactileFormPalette } from '../components/TactileFormShell';
import { TactileSectionCard } from '../components/TactileSectionCard';
import {
  tactileFieldLabelStyle,
  tactileFormLayout as layout,
  tactileMultilineInputStyle,
} from '../theme/tactileForm';

interface StoolFormScreenProps {
  busy?: boolean;
  error?: string | null;
  initialDraft?: StoolDraft;
  onBack: () => void;
  onCancelProfile?: () => void;
  onCancelTimeline?: () => void;
  onSave: (draft: StoolDraft) => void | Promise<void>;
  onSaveNoStool: () => void | Promise<void>;
}

const bristolTypes: BristolStoolType[] = [1, 2, 3, 4, 5, 6, 7];
const urgencyLevels: StoolUrgencyLevel[] = ['none', 'mild', 'moderate', 'severe'];
const symptomFields = ['pain', 'mucus', 'blood', 'fattyStool', 'blackStool'] as const;

const defaultStoolDraft: StoolDraft = {
  ...stoolDraftDefaults,
  pain: false,
  mucus: false,
  blood: false,
  fattyStool: false,
  blackStool: false,
};

function bristolDescriptionKey(type: BristolStoolType): TranslationKey {
  return `stool.bristolDescription.${type}` as TranslationKey;
}

export function StoolFormScreen({
  busy = false,
  error,
  initialDraft = defaultStoolDraft,
  onBack,
  onCancelProfile,
  onCancelTimeline,
  onSave,
  onSaveNoStool,
}: StoolFormScreenProps) {
  const locale = getActiveLocale();
  const palette = useTactileFormPalette();
  const [draft, setDraft] = useState<StoolDraft>(initialDraft);
  const [showErrors, setShowErrors] = useState(false);
  const multi = tactileMultilineInputStyle(palette);
  const label = tactileFieldLabelStyle(palette);

  function update<K extends keyof StoolDraft>(field: K, value: StoolDraft[K]) {
    setShowErrors(false);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function save() {
    if (!validateStool(draft).valid) {
      setShowErrors(true);
      return;
    }
    void onSave(draft);
  }

  return (
    <TactileFormShell
      error={showErrors ? t(locale, 'stool.requiredError') : error}
      onCancelProfile={onCancelProfile}
      onCancelTimeline={onCancelTimeline}
      onCancelToday={onBack}
      onSave={save}
      saveBusy={busy}
      subtitle={t(locale, 'stool.subtitle')}
      title={t(locale, 'stool.title')}
    >
      <TactileSectionCard icon="✓" palette={palette} title={t(locale, 'stool.noStoolToday')}>
        <Text style={[layout.helpText, { color: palette.onSurfaceVariant }]}>
          {t(locale, 'stool.noStoolDetail')}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void onSaveNoStool()}
          style={({ pressed }) => [
            layout.secondaryButton,
            layout.fullWidthButton,
            { borderColor: palette.primary },
            pressed && layout.pressed,
            busy && layout.disabled,
          ]}
        >
          <Text style={[layout.buttonLabel, { color: palette.primary }]}>
            {t(locale, 'stool.saveNoStool')}
          </Text>
        </Pressable>
      </TactileSectionCard>

      <TactileSectionCard icon="💩" palette={palette} title={t(locale, 'stool.bristolType')}>
        <View style={layout.optionGrid}>
          {bristolTypes.map((type) => {
            const selected = draft.bristolType === type;
            return (
              <Pressable
                accessibilityLabel={`${t(locale, 'stool.bristolType')} ${type}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                key={type}
                onPress={() => update('bristolType', type)}
                style={({ pressed }) => [
                  layout.optionChip,
                  {
                    backgroundColor: selected
                      ? palette.primaryContainer
                      : palette.surfaceContainerLow,
                    borderColor: selected ? palette.primary : 'transparent',
                    flexBasis: '12%',
                    minWidth: 40,
                  },
                  pressed && layout.pressed,
                ]}
              >
                <Text
                  style={[
                    layout.optionChipLabel,
                    {
                      color: selected ? palette.onPrimaryContainer : palette.onSurface,
                      fontWeight: '800',
                    },
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {draft.bristolType ? (
          <View
            style={[
              layout.statusBanner,
              { backgroundColor: palette.surfaceContainerLow },
            ]}
          >
            <Text style={{ color: palette.primary, fontSize: 15, fontWeight: '800' }}>
              {t(locale, 'stool.bristolSelected').replace('{type}', String(draft.bristolType))}
            </Text>
            <Text style={[layout.helpText, { color: palette.onSurfaceVariant }]}>
              {t(locale, bristolDescriptionKey(draft.bristolType))}
            </Text>
          </View>
        ) : null}
      </TactileSectionCard>

      <TactileSectionCard icon="⚡" palette={palette} title={t(locale, 'stool.urgency')}>
        <TactileChoiceRow
          label={t(locale, 'stool.urgency')}
          onChange={(value) => update('urgencyLevel', value as StoolUrgencyLevel)}
          options={urgencyLevels.map((level) => ({
            value: level,
            label: t(locale, `stool.urgency.${level}` as TranslationKey),
          }))}
          palette={palette}
          value={draft.urgencyLevel}
        />
      </TactileSectionCard>

      <TactileSectionCard icon="☑" palette={palette} title={t(locale, 'stool.checkmarks')}>
        <View style={layout.optionGrid}>
          {symptomFields.map((field) => {
            const selected = draft[field] === true;
            return (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                key={field}
                onPress={() => update(field, !selected)}
                style={({ pressed }) => [
                  layout.optionChip,
                  {
                    alignItems: 'center',
                    backgroundColor: selected
                      ? 'rgba(166, 53, 83, 0.08)'
                      : palette.surfaceContainerLow,
                    borderColor: selected ? palette.primary : 'transparent',
                    flexBasis: '47%',
                    flexDirection: 'row',
                    gap: 10,
                    justifyContent: 'flex-start',
                  },
                  pressed && layout.pressed,
                ]}
              >
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: selected ? palette.primary : palette.surface,
                    borderColor: selected ? palette.primary : palette.outlineVariant,
                    borderRadius: 8,
                    borderWidth: 2,
                    height: 24,
                    justifyContent: 'center',
                    width: 24,
                  }}
                >
                  {selected ? (
                    <Text style={{ color: palette.onPrimary, fontWeight: '900' }}>✓</Text>
                  ) : null}
                </View>
                <Text
                  style={{
                    color: palette.onSurface,
                    flex: 1,
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  {t(locale, `stool.${field}` as TranslationKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <FormField
          enableVoice
          label={t(locale, 'stool.notes')}
          labelStyle={label}
          multiline
          onChangeText={(value) => update('notes', value)}
          placeholder={t(locale, 'stool.notesPlaceholder')}
          style={multi}
          value={draft.notes ?? ''}
        />
      </TactileSectionCard>
    </TactileFormShell>
  );
}
