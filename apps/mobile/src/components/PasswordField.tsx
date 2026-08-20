import { spacing } from '@project4/ui-tokens';
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import { colors, sharedStyles, createThemedStyles } from '../theme';
import { useKeyboardAwareInput } from './keyboardAwareInputContext';

interface PasswordFieldProps {
  hidden: boolean;
  inputStyle?: StyleProp<TextStyle>;
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  leadingIcon?: ReactNode;
  onChangeText: (value: string) => void;
  onToggleVisibility: () => void;
  textContentType: 'newPassword' | 'password';
  toggleLabel: string;
  value: string;
}

export function PasswordField({
  hidden,
  inputStyle,
  label,
  labelStyle,
  leadingIcon,
  onChangeText,
  onToggleVisibility,
  textContentType,
  toggleLabel,
  value,
}: PasswordFieldProps) {
  const keyboardAwareInput = useKeyboardAwareInput();

  return (
    <View style={styles.field}>
      <Text style={[sharedStyles.fieldLabel, labelStyle]}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize="none"
          autoComplete={textContentType === 'newPassword' ? 'new-password' : 'password'}
          autoCorrect={false}
          onChangeText={onChangeText}
          onFocus={(event) => {
            keyboardAwareInput?.onInputFocus(event.nativeEvent.target);
          }}
          placeholderTextColor={colors.mutedText}
          secureTextEntry={hidden}
          spellCheck={false}
          style={[
            sharedStyles.input,
            styles.input,
            leadingIcon ? styles.leadingInput : undefined,
            inputStyle,
          ]}
          textContentType={textContentType}
          value={value}
        />
        {leadingIcon ? (
          <View pointerEvents="none" style={styles.leadingIcon}>
            {leadingIcon}
          </View>
        ) : null}
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

const styles = createThemedStyles(() =>
  StyleSheet.create({
    field: {
      gap: spacing.xs,
    },
    inputWrap: {
      position: 'relative',
    },
    input: {
      paddingRight: 56,
    },
    leadingInput: {
      paddingLeft: 52,
    },
    leadingIcon: {
      alignItems: 'center',
      bottom: 0,
      justifyContent: 'center',
      left: 4,
      opacity: 0.72,
      position: 'absolute',
      top: 0,
      width: 44,
    },
    toggle: {
      position: 'absolute',
      bottom: 0,
      right: 2,
      top: 0,
      width: 44,
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
  }),
);
