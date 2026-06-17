import { spacing } from '@project4/ui-tokens';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { sharedStyles } from '../theme';

interface FormFieldProps extends TextInputProps {
  label: string;
}

export function FormField({ label, ...props }: FormFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={sharedStyles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#a28d94"
        style={[sharedStyles.input, props.multiline && styles.multiline, props.style]}
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
});
