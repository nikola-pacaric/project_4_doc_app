import { painDescriptions, painLocations } from '@project4/contracts';
import type {
  PainDescription,
  PainLocation,
  SymptomDraft,
  SymptomIntensity,
} from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { DatePickerField } from './DatePickerField';
import { FormField } from './FormField';
import { OptionButtons } from './OptionButtons';
import { SelectField } from './SelectField';
import { colors, sharedStyles } from '../theme';
import { formatTimeInput, toLocalDateInput } from '../utils/dateTime';

interface SymptomDetailsCardProps {
  draft: SymptomDraft;
  invalid: boolean;
  onChange: (draft: SymptomDraft) => void;
}

function datePart(value: string | undefined): string {
  const candidate = value?.trim().split(/[ T]/)[0] ?? '';
  return /^\d{0,4}(?:-\d{0,2})?(?:-\d{0,2})?$/.test(candidate) ? candidate : '';
}

function timePart(value: string | undefined): string {
  const candidate = value?.trim().split(/[ T]/).at(-1) ?? '';
  return /^\d{0,2}(?::\d{0,2})?$/.test(candidate) ? candidate : '';
}

export function SymptomDetailsCard({ draft, invalid, onChange }: SymptomDetailsCardProps) {
  const locale = DEFAULT_LOCALE;

  function update(field: keyof SymptomDraft, value: string | boolean | SymptomIntensity) {
    onChange({ ...draft, [field]: value });
  }

  function updateDateTime(field: 'startedAt' | 'endedAt', date?: string, time?: string) {
    const nextDate = date ?? datePart(draft[field]);
    const currentTime = timePart(draft[field]);
    const nextTime = time === undefined ? currentTime : formatTimeInput(time, currentTime, 23);
    update(field, `${nextDate} ${nextTime}`.trim());
  }

  const symptomLabel = draft.type ? t(locale, `symptom.type.${draft.type}`) : '';
  const startDate = datePart(draft.startedAt) || toLocalDateInput(new Date());
  const endDate = datePart(draft.endedAt) || startDate;

  return (
    <View style={[styles.card, invalid && styles.cardInvalid]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{symptomLabel}</Text>
        <Text style={styles.required}>{t(locale, 'symptom.detailsRequired')}</Text>
      </View>

      {draft.type === 'other' ? (
        <FormField
          label={t(locale, 'symptom.customType')}
          onChangeText={(value) => update('customType', value)}
          value={draft.customType}
        />
      ) : null}

      <Text style={styles.groupTitle}>{t(locale, 'symptom.timingTitle')}</Text>
      <View style={styles.inputRow}>
        <View style={styles.inputColumn}>
          <DatePickerField
            label={t(locale, 'symptom.startDate')}
            maximumDate={new Date()}
            onChange={(value) => updateDateTime('startedAt', value, undefined)}
            value={startDate}
          />
        </View>
        <View style={styles.inputColumn}>
          <FormField
            autoCapitalize="none"
            keyboardType="number-pad"
            label={t(locale, 'symptom.startTime')}
            maxLength={5}
            onChangeText={(value) => updateDateTime('startedAt', undefined, value)}
            value={timePart(draft.startedAt)}
          />
        </View>
      </View>
      <Text style={styles.help}>{t(locale, 'symptom.endHelp')}</Text>
      <View style={styles.inputRow}>
        <View style={styles.inputColumn}>
          <DatePickerField
            label={t(locale, 'symptom.endDate')}
            maximumDate={new Date()}
            onChange={(value) => updateDateTime('endedAt', value, undefined)}
            value={endDate}
          />
        </View>
        <View style={styles.inputColumn}>
          <FormField
            autoCapitalize="none"
            keyboardType="number-pad"
            label={t(locale, 'symptom.endTime')}
            maxLength={5}
            onChangeText={(value) => updateDateTime('endedAt', endDate, value)}
            value={timePart(draft.endedAt)}
          />
        </View>
      </View>

      <OptionButtons
        label={t(locale, 'symptom.intensity')}
        onChange={(value) => update('intensity', Number(value) as SymptomIntensity)}
        options={([1, 2, 3] as const).map((value) => ({
          value: String(value),
          label: String(value),
          detail: t(locale, `symptom.intensity${value}`),
        }))}
        value={draft.intensity ? String(draft.intensity) : undefined}
        vertical
      />

      <FormField
        label={t(locale, 'symptom.modifyingFactors')}
        multiline
        onChangeText={(value) => update('modifyingFactors', value)}
        placeholder={t(locale, 'symptom.modifyingFactorsPlaceholder')}
        value={draft.modifyingFactors}
      />

      <OptionButtons
        label={t(locale, 'symptom.sleepInterruption')}
        onChange={(value) => update('wokeFromSleep', value === 'yes')}
        options={[
          { value: 'no', label: t(locale, 'common.no') },
          { value: 'yes', label: t(locale, 'common.yes') },
        ]}
        value={draft.wokeFromSleep === undefined ? undefined : draft.wokeFromSleep ? 'yes' : 'no'}
      />

      {draft.type === 'pain' ? (
        <View style={styles.painSection}>
          <Text style={styles.groupTitle}>{t(locale, 'symptom.painTitle')}</Text>
          <SelectField
            label={t(locale, 'symptom.painLocation')}
            onChange={(value) => update('painLocation', value as PainLocation)}
            options={painLocations.map((location) => ({
              value: location,
              label: t(locale, `symptom.painLocation.${location}`),
            }))}
            placeholder={t(locale, 'symptom.selectOption')}
            value={draft.painLocation}
          />
          {draft.painLocation === 'other' ? (
            <FormField
              label={t(locale, 'symptom.painLocationCustom')}
              onChangeText={(value) => update('painLocationCustom', value)}
              value={draft.painLocationCustom}
            />
          ) : null}
          <OptionButtons
            label={t(locale, 'symptom.painRadiates')}
            onChange={(value) => update('painRadiates', value === 'yes')}
            options={[
              { value: 'no', label: t(locale, 'common.no') },
              { value: 'yes', label: t(locale, 'common.yes') },
            ]}
            value={draft.painRadiates === undefined ? undefined : draft.painRadiates ? 'yes' : 'no'}
          />
          {draft.painRadiates ? (
            <FormField
              label={t(locale, 'symptom.painRadiation')}
              onChangeText={(value) => update('painRadiation', value)}
              value={draft.painRadiation}
            />
          ) : null}
          <SelectField
            label={t(locale, 'symptom.painDescription')}
            onChange={(value) => update('painDescription', value as PainDescription)}
            options={painDescriptions.map((description) => ({
              value: description,
              label: t(locale, `symptom.painDescription.${description}`),
            }))}
            placeholder={t(locale, 'symptom.selectOption')}
            value={draft.painDescription}
          />
          {draft.painDescription === 'other' ? (
            <FormField
              label={t(locale, 'symptom.painDescriptionCustom')}
              multiline
              onChangeText={(value) => update('painDescriptionCustom', value)}
              value={draft.painDescriptionCustom}
            />
          ) : null}
        </View>
      ) : null}

      {invalid ? <Text style={sharedStyles.error}>{t(locale, 'symptom.cardError')}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  cardInvalid: {
    borderColor: colors.danger,
  },
  cardHeader: {
    gap: spacing.xs,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
  },
  required: {
    color: colors.mutedText,
    fontSize: 13,
  },
  groupTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  help: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputColumn: {
    flex: 1,
  },
  painSection: {
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
});
