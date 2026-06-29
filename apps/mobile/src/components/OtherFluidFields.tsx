import { isOtherFluidDraftStarted, type OtherFluidDraft } from '@project4/forms';
import { DEFAULT_LOCALE, t } from '@project4/i18n';
import { spacing } from '@project4/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import { formatTimeInput, toLocalDateInput } from '../utils/dateTime';
import { FormField } from './FormField';
import { PrimaryButton } from './PrimaryButton';

interface OtherFluidFieldsProps {
  createFluid: () => OtherFluidDraft;
  fluids: OtherFluidDraft[];
  onChange: (fluids: OtherFluidDraft[]) => void;
}

export function OtherFluidFields({ createFluid, fluids, onChange }: OtherFluidFieldsProps) {
  const locale = DEFAULT_LOCALE;

  function updateFluid(index: number, update: Partial<OtherFluidDraft>) {
    onChange(
      fluids.map((fluid, fluidIndex) => (fluidIndex === index ? { ...fluid, ...update } : fluid)),
    );
  }

  function removeFluid(index: number) {
    const remainingFluids = fluids.filter((_, fluidIndex) => fluidIndex !== index);
    onChange(remainingFluids.length ? remainingFluids : [createFluid()]);
  }

  function updateFluidTime(index: number, value: string) {
    const current = fluids[index];
    const date = current?.occurredAt?.slice(0, 10) ?? toLocalDateInput(new Date());
    const time = current?.occurredAt?.slice(11, 16) ?? '';
    const nextTime = formatTimeInput(value, time, 23);
    updateFluid(index, { occurredAt: nextTime ? `${date} ${nextTime}` : undefined });
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t(locale, 'fluid.sectionTitle')}</Text>
      <Text style={styles.help}>{t(locale, 'fluid.sectionHelp')}</Text>
      {fluids.map((fluid, index) => (
        <View style={styles.card} key={index}>
          <FormField
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            label={t(locale, 'fluid.time')}
            maxLength={5}
            onChangeText={(value) => updateFluidTime(index, value)}
            placeholder={t(locale, 'fluid.timePlaceholder')}
            value={fluid.occurredAt?.slice(11, 16) ?? ''}
          />
          <FormField
            label={t(locale, 'fluid.name')}
            onChangeText={(value) => updateFluid(index, { name: value })}
            value={fluid.name ?? ''}
          />
          {fluids.length > 1 || isOtherFluidDraftStarted(fluid) ? (
            <PrimaryButton
              label={t(locale, 'fluid.remove')}
              onPress={() => removeFluid(index)}
              variant="danger"
            />
          ) : null}
        </View>
      ))}
      <PrimaryButton
        label={`+ ${t(locale, 'fluid.add')}`}
        onPress={() => onChange([...fluids, createFluid()])}
        variant="secondary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: '#fffafb',
    padding: spacing.md,
  },
  title: { color: colors.text, fontSize: 19, fontWeight: '800' },
  help: { color: colors.mutedText, fontSize: 15, lineHeight: 22 },
  card: { gap: spacing.sm },
});
