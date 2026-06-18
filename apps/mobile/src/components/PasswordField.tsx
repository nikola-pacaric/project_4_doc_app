import { spacing } from '@project4/ui-tokens';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, sharedStyles } from '../theme';

interface PasswordFieldProps {
  hidden: boolean;
  label: string;
  onChangeText: (value: string) => void;
  onToggleVisibility: () => void;
  textContentType: 'newPassword' | 'password';
  toggleLabel: string;
  value: string;
}

export function PasswordField({
  hidden,
  label,
  onChangeText,
  onToggleVisibility,
  textContentType,
  toggleLabel,
  value,
}: PasswordFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={sharedStyles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize="none"
          autoComplete={textContentType === 'newPassword' ? 'new-password' : 'password'}
          onChangeText={onChangeText}
          placeholderTextColor="#a28d94"
          secureTextEntry={hidden}
          style={[sharedStyles.input, styles.input]}
          textContentType={textContentType}
          value={value}
        />
        <Pressable
          accessibilityLabel={toggleLabel}
          accessibilityRole="button"
          accessibilityState={{ selected: !hidden }}
          hitSlop={4}
          onPress={onToggleVisibility}
          style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
        >
          <View style={styles.eye}>
            <View style={styles.iris} />
          </View>
          {hidden ? <View style={styles.slash} /> : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    paddingRight: 56,
  },
  toggle: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.55,
  },
  eye: {
    width: 19,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.mutedText,
    borderRadius: 12,
  },
  iris: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.mutedText,
  },
  slash: {
    position: 'absolute',
    width: 22,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: colors.mutedText,
    transform: [{ rotate: '42deg' }],
  },
});
