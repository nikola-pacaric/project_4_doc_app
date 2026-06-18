import { spacing } from '@project4/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, sharedStyles } from '../theme';

interface Option {
  label: string;
  value: string;
  detail?: string;
}

interface OptionButtonsProps {
  label: string;
  onChange: (value: string) => void;
  options: Option[];
  value?: string;
  vertical?: boolean;
}

export function OptionButtons({
  label,
  onChange,
  options,
  value,
  vertical = false,
}: OptionButtonsProps) {
  return (
    <View style={styles.field}>
      <Text style={sharedStyles.fieldLabel}>{label}</Text>
      <View accessibilityRole="radiogroup" style={[styles.options, vertical && styles.vertical]}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              accessibilityLabel={`${label}: ${option.label}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.option, selected && styles.selected]}
            >
              <Text style={[styles.optionLabel, selected && styles.selectedText]}>
                {option.label}
              </Text>
              {option.detail ? (
                <Text style={[styles.optionDetail, selected && styles.selectedText]}>
                  {option.detail}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  options: { flexDirection: 'row', gap: spacing.sm },
  vertical: { flexDirection: 'column' },
  option: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  selected: { borderColor: colors.accent, backgroundColor: '#fff0f3' },
  optionLabel: { color: colors.text, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  optionDetail: { color: colors.mutedText, fontSize: 11, fontWeight: '700' },
  selectedText: { color: colors.accent },
});
