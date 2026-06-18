import { spacing } from '@project4/ui-tokens';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, sharedStyles } from '../theme';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectFieldProps {
  label: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  value?: string;
}

export function SelectField({ label, onChange, options, placeholder, value }: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <View style={styles.field}>
      <Text style={sharedStyles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={styles.control}
      >
        <Text style={[styles.controlText, !selectedLabel && styles.placeholder]}>
          {selectedLabel ?? placeholder}
        </Text>
        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open ? (
        <View style={styles.menu}>
          {options.map((option) => (
            <Pressable
              accessibilityRole="button"
              key={option.value}
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
              style={[styles.menuOption, option.value === value && styles.menuOptionSelected]}
            >
              <Text
                style={[
                  styles.menuOptionText,
                  option.value === value && styles.menuOptionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  control: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  controlText: { color: colors.text, fontSize: 17, fontWeight: '600' },
  placeholder: { color: colors.mutedText },
  chevron: { color: colors.accent, fontSize: 12 },
  menu: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  menuOption: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  menuOptionSelected: { backgroundColor: '#fff0f3' },
  menuOptionText: { color: colors.text, fontSize: 16 },
  menuOptionTextSelected: { color: colors.accent, fontWeight: '800' },
});
