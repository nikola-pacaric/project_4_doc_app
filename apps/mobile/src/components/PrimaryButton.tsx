import { spacing, typography } from '@project4/ui-tokens';
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { colors } from '../theme';

interface PrimaryButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  busy?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function PrimaryButton({
  label,
  busy = false,
  disabled,
  variant = 'primary',
  ...props
}: PrimaryButtonProps) {
  const isDisabled = disabled || busy;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      {...props}
    >
      {busy ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.accent : '#ffffff'} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'secondary' ? styles.secondaryLabel : styles.primaryLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: typography.controlMinHeight,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
  },
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
  },
  danger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  primaryLabel: {
    color: '#ffffff',
  },
  secondaryLabel: {
    color: colors.accent,
  },
});
