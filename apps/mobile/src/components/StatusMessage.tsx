import { Text, type StyleProp, type TextStyle } from 'react-native';

interface StatusMessageProps {
  message: string;
  style: StyleProp<TextStyle>;
  tone: 'error' | 'success';
}

export function StatusMessage({ message, style, tone }: StatusMessageProps) {
  const isError = tone === 'error';

  return (
    <Text
      accessibilityLiveRegion={isError ? 'assertive' : 'polite'}
      accessibilityRole={isError ? 'alert' : undefined}
      selectable
      style={style}
    >
      {message}
    </Text>
  );
}
