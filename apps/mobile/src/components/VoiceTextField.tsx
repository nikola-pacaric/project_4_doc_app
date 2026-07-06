import type { TextInputProps } from 'react-native';

import { FormField } from './FormField';

interface VoiceTextFieldProps extends Omit<TextInputProps, 'onChangeText' | 'value'> {
  label: string;
  onChangeText: (text: string) => void;
  value: string;
}

export function VoiceTextField({ label, onChangeText, value, ...props }: VoiceTextFieldProps) {
  return (
    <FormField enableVoice label={label} onChangeText={onChangeText} value={value} {...props} />
  );
}
