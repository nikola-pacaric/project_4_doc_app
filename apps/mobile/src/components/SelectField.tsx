import { spacing } from '@project4/ui-tokens';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, sharedStyles, createThemedStyles } from '../theme';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectFieldProps {
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  style?: StyleProp<ViewStyle>;
  value?: string;
  valueStyle?: StyleProp<TextStyle>;
  chevronStyle?: StyleProp<TextStyle>;
  menuStyle?: StyleProp<ViewStyle>;
}

export function SelectField({
  label,
  labelStyle,
  onChange,
  options,
  placeholder,
  style,
  value,
  valueStyle,
  chevronStyle,
  menuStyle,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <View style={styles.field}>
      <Text style={[sharedStyles.fieldLabel, labelStyle]}>{label}</Text>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [styles.control, style, pressed && styles.pressed]}
      >
        <Text
          style={[
            styles.controlText,
            !selectedLabel && styles.placeholder,
            valueStyle,
            !selectedLabel && valueStyle ? { opacity: 0.65 } : null,
          ]}
        >
          {selectedLabel ?? placeholder}
        </Text>
        <Text style={[styles.chevron, chevronStyle]}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open ? (
        <View style={[styles.menu, menuStyle]}>
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
                  valueStyle,
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

const styles = createThemedStyles(() =>
  StyleSheet.create({
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
    pressed: { opacity: 0.72 },
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
    menuOptionSelected: { backgroundColor: colors.background },
    menuOptionText: { color: colors.text, fontSize: 16 },
    menuOptionTextSelected: { color: colors.accent, fontWeight: '800' },
  }),
);
