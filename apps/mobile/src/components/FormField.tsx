import { spacing } from '@project4/ui-tokens';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, sharedStyles } from '../theme';

interface FormFieldProps extends TextInputProps {
  label: string;
}

export function FormField({ label, ...props }: FormFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={sharedStyles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCorrect={false}
        placeholderTextColor="#a28d94"
        spellCheck={false}
        style={[
          sharedStyles.input,
          props.multiline && styles.multiline,
          props.editable === false && styles.readOnly,
          props.style,
        ]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  multiline: {
    minHeight: 112,
    textAlignVertical: 'top',
  },
  readOnly: {
    backgroundColor: colors.background,
    color: colors.mutedText,
  },
});
