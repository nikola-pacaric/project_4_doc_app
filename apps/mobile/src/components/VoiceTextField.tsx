import type { StyleProp, TextInputProps, TextStyle } from 'react-native';

import { FormField } from './FormField';

interface VoiceTextFieldProps extends Omit<TextInputProps, 'onChangeText' | 'value'> {
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  onChangeText: (text: string) => void;
  value: string;
}

export function VoiceTextField({
  label,
  labelStyle,
  onChangeText,
  value,
  ...props
}: VoiceTextFieldProps) {
  return (
    <FormField
      enableVoice
      label={label}
      labelStyle={labelStyle}
      onChangeText={onChangeText}
      value={value}
      {...props}
    />
  );
}
